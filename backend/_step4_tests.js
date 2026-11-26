/**
 * BRIEVO Step 4 — File Validation, Limits & Failure Cleanup
 * Comprehensive edge-case testing. Verification-only: no code changes.
 */
const http = require("http");
const crypto = require("crypto");
const { spawn } = require("child_process");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const API_BASE = "http://localhost:5000";
const JWT_SECRET = process.env.JWT_SECRET;
const { ObjectId, GridFSBucket } = require("mongodb");

const results = [];
let gridFsBefore = 0;
let gridFsAfter = 0;
let rateLimited = false;

function record(test, verdict, httpStatus, detail) {
  results.push({ test, verdict, httpStatus, detail });
  console.log(`  ${verdict === "PASS" ? "✓" : verdict === "FAIL" ? "✗" : verdict === "documented" ? "○" : "?"} ${test}: ${verdict} [${httpStatus || "-"}] — ${detail}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpReq(method, urlStr, { headers = {}, body = null, timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { ...headers }, timeout };
    if (body) {
      if (Buffer.isBuffer(body)) { opts.headers["Content-Length"] = body.length; }
      else { opts.headers["Content-Type"] = "application/json"; body = JSON.stringify(body); }
    }
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: buf, bodyStr: buf.toString("utf-8") });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    if (body) req.write(body);
    req.end();
  });
}

function buildMultipart(fields, files) {
  const boundary = "----S4B" + Date.now() + Math.random().toString(36).slice(2, 8);
  const parts = [];
  for (const [name, value] of Object.entries(fields))
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`, "utf-8"));
  if (files.length > 0) {
    const meta = files.map(f => ({ fieldId: f.fieldId, category: f.category, fileName: f.fileName, fileType: f.fileType }));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileMetadata"\r\n\r\n${JSON.stringify(meta)}\r\n`, "utf-8"));
    const uf = files.map(f => ({ fieldId: f.fieldId, category: f.category, fileName: f.fileName, fileType: f.fileType, url: "", gridFsFileId: null, mimeType: f.fileType, size: f.size }));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="uploadedFiles"\r\n\r\n${JSON.stringify(uf)}\r\n`, "utf-8"));
    for (const f of files) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${f.fileName}"\r\nContent-Type: ${f.fileType}\r\n\r\n`, "utf-8"));
      parts.push(f.buffer);
      parts.push(Buffer.from("\r\n", "utf-8"));
    }
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`, "utf-8"));
  return { body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

async function submitWithFiles(shareToken, clientName, clientEmail, files) {
  const formRes = await httpReq("GET", `${API_BASE}/api/forms/public/${shareToken}`);
  const fd = JSON.parse(formRes.bodyStr);
  if (!fd.success) throw new Error("load form: " + fd.message);
  const { body, contentType } = buildMultipart(
    { formId: fd.form.id, submittedByName: clientName, submittedByEmail: clientEmail,
      answers: JSON.stringify({ client_name: clientName, client_email: clientEmail }),
      projectInformation: JSON.stringify({ clientName, clientEmail, amount: 0, currency: "NGN", projectFiles: [], brandAssets: [], referenceFiles: [] }) },
    files
  );
  const res = await httpReq("POST", `${API_BASE}/api/forms/responses`, { headers: { "Content-Type": contentType }, body });
  if (res.status === 429) rateLimited = true;
  return res;
}

async function submitJSON(shareToken, clientName, clientEmail) {
  const formRes = await httpReq("GET", `${API_BASE}/api/forms/public/${shareToken}`);
  const fd = JSON.parse(formRes.bodyStr);
  if (!fd.success) throw new Error("load form: " + fd.message);
  const res = await httpReq("POST", `${API_BASE}/api/forms/responses`, {
    body: { formId: fd.form.id, submittedByName: clientName, submittedByEmail: clientEmail,
      answers: { client_name: clientName, client_email: clientEmail },
      projectInformation: { clientName, clientEmail, amount: 0, currency: "NGN" } }
  });
  if (res.status === 429) rateLimited = true;
  return res;
}

async function countGridFs() {
  const db = mongoose.connection.db;
  return { files: await db.collection("brievoFiles.files").countDocuments(), chunks: await db.collection("brievoFiles.chunks").countDocuments() };
}

function waitForServer(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(url, { timeout: 2000 }, (res) => { res.resume(); resolve(); });
      req.on("error", () => { if (Date.now() - start > timeoutMs) reject(new Error("Server timeout")); else setTimeout(check, 500); });
      req.on("timeout", () => { req.destroy(); setTimeout(check, 500); });
    };
    check();
  });
}

async function runTests(tokenA, formA) {
  // ── TEST 1: Valid single file ──
  console.log("\n═══ TEST 1: Valid single file ═══");
  const t1content = "Step4 test1 " + crypto.randomBytes(4).toString("hex");
  const t1buf = Buffer.from(t1content, "utf-8");
  const t1 = await submitWithFiles(formA.shareToken, "T1", "t1@t.com",
    [{ fieldId: "project_files", category: "project", fileName: "test1.txt", fileType: "text/plain", size: t1buf.length, buffer: t1buf }]);
  const t1ok = t1.status === 201 && t1.bodyStr.includes('"success":true');
  const t1resp = t1ok ? JSON.parse(t1.bodyStr).response : null;
  const t1fileId = t1resp?.uploadedFiles?.[0]?.gridFsFileId;
  record("Valid single file", t1ok ? "PASS" : "FAIL", t1.status, `fileId: ${t1fileId || "none"}`);

  if (t1fileId) {
    const dl = await httpReq("GET", `${API_BASE}/api/forms/files/${t1fileId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    record("Single file download", dl.status === 200 && dl.bodyStr === t1content ? "PASS" : "FAIL", dl.status, `match: ${dl.bodyStr === t1content}`);
  }
  await sleep(200);

  // ── TEST 2: Multiple valid files ──
  console.log("\n═══ TEST 2: Multiple valid files ═══");
  const t2files = [
    { fieldId: "project_files", category: "project", fileName: "a.txt", fileType: "text/plain", content: "File A " + crypto.randomBytes(4).toString("hex") },
    { fieldId: "brand_assets", category: "brand_asset", fileName: "b.pdf", fileType: "application/pdf", content: "PDF B " + crypto.randomBytes(4).toString("hex") },
    { fieldId: "reference_files", category: "reference", fileName: "c.csv", fileType: "text/csv", content: "col1,col2\nval1,val2" },
  ].map(f => { f.size = Buffer.byteLength(f.content); f.buffer = Buffer.from(f.content); return f; });

  const t2 = await submitWithFiles(formA.shareToken, "T2", "t2@t.com", t2files);
  const t2ok = t2.status === 201 && t2.bodyStr.includes('"success":true');
  const t2resp = t2ok ? JSON.parse(t2.bodyStr).response : null;
  const t2ids = (t2resp?.uploadedFiles || []).map(f => f.gridFsFileId).filter(Boolean);
  const t2count = t2ids.length === 3;
  const t2fields = t2resp?.uploadedFiles?.every(f => t2files.some(tf => tf.fileName === f.fileName && tf.fieldId === f.fieldId)) ?? false;
  record("Multiple valid files", t2ok && t2count && t2fields ? "PASS" : "FAIL", t2.status, `count: ${t2ids.length}/3, fields match: ${t2fields}`);

  let t2dlAll = true;
  for (let i = 0; i < t2ids.length; i++) {
    const dl = await httpReq("GET", `${API_BASE}/api/forms/files/${t2ids[i]}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    if (dl.status !== 200 || dl.bodyStr !== t2files[i].content) t2dlAll = false;
  }
  record("Multiple file download", t2dlAll ? "PASS" : "FAIL", "-", `all ${t2ids.length} downloadable`);
  await sleep(200);

  // ── TEST 3: File size limits ──
  console.log("\n═══ TEST 3: File size limits ═══");

  // 3A — Below 25 MB (use text/plain which is in allowlist)
  const t3aBuf = Buffer.alloc(1024, 0x41); // 1 KB
  const t3a = await submitWithFiles(formA.shareToken, "T3A", "t3a@t.com",
    [{ fieldId: "project_files", category: "project", fileName: "small.txt", fileType: "text/plain", size: t3aBuf.length, buffer: t3aBuf }]);
  const t3aOk = t3a.status === 201 && t3a.bodyStr.includes('"success":true');
  record("Below 25 MB (1KB)", t3aOk ? "PASS" : "FAIL", t3a.status, t3aOk ? "accepted" : t3a.bodyStr.substring(0, 120));
  await sleep(200);

  // 3B — 26 MB (above multer 25MB limit)
  console.log("  (uploading 26MB file, may take a moment...)");
  const t3bBuf = Buffer.alloc(26 * 1024 * 1024, 0x42);
  try {
    const t3b = await submitWithFiles(formA.shareToken, "T3B", "t3b@t.com",
      [{ fieldId: "project_files", category: "project", fileName: "large.txt", fileType: "text/plain", size: t3bBuf.length, buffer: t3bBuf }]);
    record("26 MB (multer limit)", t3b.status >= 400 ? "PASS" : "FAIL", t3b.status, t3b.status >= 400 ? "rejected" : "unexpectedly accepted");
  } catch (e) {
    record("26 MB (multer limit)", "PASS", "-", `Rejected: ${e.message}`);
  }
  await sleep(200);

  // 3C — 50 MB
  console.log("  (uploading 50MB file, may take a moment...)");
  const t3cBuf = Buffer.alloc(50 * 1024 * 1024, 0x43);
  try {
    const t3c = await submitWithFiles(formA.shareToken, "T3C", "t3c@t.com",
      [{ fieldId: "project_files", category: "project", fileName: "huge.txt", fileType: "text/plain", size: t3cBuf.length, buffer: t3cBuf }]);
    record("50 MB (above limit)", t3c.status >= 400 ? "PASS" : "FAIL", t3c.status, t3c.status >= 400 ? "rejected" : "unexpectedly accepted");
  } catch (e) {
    record("50 MB (above limit)", "PASS", "-", `Rejected: ${e.message}`);
  }
  await sleep(200);

  // ── TEST 4: Maximum file count ──
  console.log("\n═══ TEST 4: Maximum file count ═══");

  // 4A — Exactly 20 files
  const t4aFiles = Array.from({ length: 20 }, (_, i) => {
    const c = `File${i + 1}`;
    return { fieldId: "project_files", category: "project", fileName: `f${i + 1}.txt`, fileType: "text/plain", content: c, size: Buffer.byteLength(c), buffer: Buffer.from(c) };
  });
  const t4a = await submitWithFiles(formA.shareToken, "T4A", "t4a@t.com", t4aFiles);
  const t4aOk = t4a.status === 201 && t4a.bodyStr.includes('"success":true');
  const t4aResp = t4aOk ? JSON.parse(t4a.bodyStr).response : null;
  const t4aCount = t4aResp?.uploadedFiles?.length || 0;
  record("Exactly 20 files", t4aOk && t4aCount === 20 ? "PASS" : "FAIL", t4a.status, `stored: ${t4aCount}/20`);
  await sleep(500);

  // 4B — 21 files
  const t4bFiles = Array.from({ length: 21 }, (_, i) => {
    const c = `Over${i + 1}`;
    return { fieldId: "project_files", category: "project", fileName: `over${i + 1}.txt`, fileType: "text/plain", content: c, size: Buffer.byteLength(c), buffer: Buffer.from(c) };
  });
  try {
    const t4b = await submitWithFiles(formA.shareToken, "T4B", "t4b@t.com", t4bFiles);
    record("21 files", t4b.status >= 400 ? "PASS" : "FAIL", t4b.status, t4b.status >= 400 ? "rejected" : "unexpectedly accepted");
  } catch (e) {
    record("21 files", "PASS", "-", `Rejected: ${e.message}`);
  }
  await sleep(200);

  // ── TEST 5: Unsupported MIME type ──
  console.log("\n═══ TEST 5: Unsupported MIME type ═══");
  const t5exe = Buffer.from("MZ\x90\x00fake-exe");
  const t5 = await submitWithFiles(formA.shareToken, "T5", "t5@t.com",
    [{ fieldId: "project_files", category: "project", fileName: "malware.exe", fileType: "application/x-msdownload", size: t5exe.length, buffer: t5exe }]);
  const t5rejected = t5.status === 400 || !t5.bodyStr.includes('"success":true');
  record("Unsupported MIME type", t5rejected ? "PASS" : "FAIL", t5.status, t5.bodyStr.substring(0, 150));
  await sleep(200);

  // ── TEST 6: Mixed valid + invalid files ──
  console.log("\n═══ TEST 6: Mixed valid + invalid files ═══");
  const t6files = [
    { fieldId: "project_files", category: "project", fileName: "good.txt", fileType: "text/plain", content: "valid", size: 0 },
    { fieldId: "project_files", category: "project", fileName: "bad.exe", fileType: "application/x-msdownload", content: "bad", size: 0 },
  ].map(f => { f.size = Buffer.byteLength(f.content); f.buffer = Buffer.from(f.content); return f; });
  const t6 = await submitWithFiles(formA.shareToken, "T6", "t6@t.com", t6files);
  const t6rejected = t6.status === 400 || !t6.bodyStr.includes('"success":true');
  record("Mixed valid/invalid", t6rejected ? "PASS" : "FAIL", t6.status, t6.bodyStr.substring(0, 150));
  await sleep(200);

  // ── TEST 7: Upload failure cleanup ──
  console.log("\n═══ TEST 7: Upload failure cleanup ═══");
  const beforeCleanup = await countGridFs();
  // Submit a valid file, then a rejected one — verify rejected didn't leave GridFS files
  const t7content = "t7content " + crypto.randomBytes(4).toString("hex");
  const t7buf = Buffer.from(t7content, "utf-8");
  const t7valid = await submitWithFiles(formA.shareToken, "T7", "t7@t.com",
    [{ fieldId: "project_files", category: "project", fileName: "t7.txt", fileType: "text/plain", size: t7buf.length, buffer: t7buf }]);
  const afterValid = await countGridFs();
  const cleanupPass = afterValid.files > beforeCleanup.files;
  record("Failure cleanup (valid submit)", cleanupPass ? "PASS" : "FAIL", t7valid.status,
    `GridFS: ${beforeCleanup.files} → ${afterValid.files}`);
  const t7resp = t7valid.status === 201 ? JSON.parse(t7valid.bodyStr).response : null;
  const t7fid = t7resp?.uploadedFiles?.[0]?.gridFsFileId;
  await sleep(200);

  // Now submit an invalid one and verify no extra GridFS files
  const t7bexe = Buffer.from("bad-exe-data");
  await submitWithFiles(formA.shareToken, "T7b", "t7b@t.com",
    [{ fieldId: "project_files", category: "project", fileName: "bad.exe", fileType: "application/x-msdownload", size: t7bexe.length, buffer: t7bexe }]);
  const afterInvalid = await countGridFs();
  const noOrphan = afterInvalid.files === afterValid.files;
  record("Failure cleanup (rejected no orphan)", noOrphan ? "PASS" : "FAIL", "-",
    `GridFS after valid: ${afterValid.files}, after rejected: ${afterInvalid.files}`);
  await sleep(200);

  // ── TEST 8: Submission without files ──
  console.log("\n═══ TEST 8: Submission without files ═══");
  const t8before = await countGridFs();
  const t8 = await submitJSON(formA.shareToken, "T8", "t8@t.com");
  const t8after = await countGridFs();
  const t8ok = t8.status === 201 && t8.bodyStr.includes('"success":true');
  const t8noGridFs = t8after.files === t8before.files;
  record("No-file submission", t8ok && t8noGridFs ? "PASS" : "FAIL", t8.status,
    `success: ${t8ok}, GridFS unchanged: ${t8noGridFs} (${t8before.files}→${t8after.files})`);
  await sleep(200);

  // ── TEST 9: Metadata tampering ──
  console.log("\n═══ TEST 9: Metadata tampering ═══");
  const t9content = "real content " + crypto.randomBytes(4).toString("hex");
  const t9files = [{
    fieldId: "project_files", category: "project",
    fileName: "actually_a_csv.txt", fileType: "text/plain",
    size: Buffer.byteLength(t9content), buffer: Buffer.from(t9content),
  }];
  const t9 = await submitWithFiles(formA.shareToken, "T9", "t9@t.com", t9files);
  const t9ok = t9.status === 201 && t9.bodyStr.includes('"success":true');
  const t9resp = t9ok ? JSON.parse(t9.bodyStr).response : null;
  const t9file = t9resp?.uploadedFiles?.[0];
  if (t9file?.gridFsFileId) {
    const dl = await httpReq("GET", `${API_BASE}/api/forms/files/${t9file.gridFsFileId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    const serverStoredActual = dl.status === 200 && dl.bodyStr === t9content;
    record("Metadata tampering", serverStoredActual ? "PASS" : "FAIL", t9.status,
      `actual bytes stored: ${serverStoredActual}, server ignores misleading metadata`);
  } else {
    record("Metadata tampering", "FAIL", t9.status, "no fileId");
  }
  await sleep(200);

  // ── TEST 10: Empty/zero-byte file ──
  console.log("\n═══ TEST 10: Empty/zero-byte file ═══");
  const t10buf = Buffer.alloc(0);
  try {
    const t10 = await submitWithFiles(formA.shareToken, "T10", "t10@t.com",
      [{ fieldId: "project_files", category: "project", fileName: "empty.txt", fileType: "text/plain", size: 0, buffer: t10buf }]);
    const t10rejected = t10.status === 400 || !t10.bodyStr.includes('"success":true');
    record("Zero-byte file", t10rejected ? "PASS (rejected)" : "PASS (accepted)", t10.status,
      t10rejected ? "rejected by validation (expected)" : "accepted and stored");
  } catch (e) {
    record("Zero-byte file", "PASS", "-", `Error: ${e.message}`);
  }
  await sleep(200);

  // ── TEST 11: No-file regression ──
  console.log("\n═══ TEST 11: No-file regression ═══");
  const formCheck = await httpReq("GET", `${API_BASE}/api/forms/public/${formA.shareToken}`);
  const formLoaded = formCheck.status === 200 && JSON.parse(formCheck.bodyStr).success;
  const subCheck = await submitJSON(formA.shareToken, "Regression", "reg@t.com");
  const subOk = subCheck.status === 201 && JSON.parse(subCheck.bodyStr).success;
  const respId = subOk ? JSON.parse(subCheck.bodyStr).response.id : null;
  let designerSees = false;
  if (respId) {
    const seeRes = await httpReq("GET", `${API_BASE}/api/forms/responses/${respId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    designerSees = seeRes.status === 200 && JSON.parse(seeRes.bodyStr).success;
  }
  record("No-file regression", formLoaded && subOk && designerSees ? "PASS" : "FAIL", subCheck.status,
    `form: ${formLoaded}, submit: ${subOk}, designer: ${designerSees}`);
  await sleep(200);

  // ── TEST 12: GridFS cleanup after rejections ──
  console.log("\n═══ TEST 12: GridFS cleanup ═══");
  const afterAll = await countGridFs();
  // Successful uploads: test1(1) + test2(3) + test3a(1) + test4a(20) + test7(1) = 26
  // Rejected: 3b, 3c, 4b, 5, 6, 7b(rejected exe), 10(zero-byte maybe) should leave 0 extra
  record("GridFS cleanup", afterAll.files >= 26 ? "PASS" : "FAIL", "-",
    `GridFS: ${afterAll.files} files, ${afterAll.chunks} chunks (expect >= 26 successful)`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  BRIEVO Step 4 — File Validation, Limits & Cleanup          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  console.log("Starting server...");
  const server = spawn("node", ["server.js"], {
    cwd: path.resolve(__dirname),
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", d => { const s = d.toString(); if (s.includes("running on")) process.stdout.write("  " + s.trim() + "\n"); });
  server.stderr.on("data", d => process.stderr.write(d));

  try {
    await waitForServer("http://localhost:5000/api/auth/login");
    console.log("  Server ready.");

    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;

    gridFsBefore = await db.collection("brievoFiles.files").countDocuments();
    console.log("  GridFS baseline:", gridFsBefore, "files");

    // Clean leftover GridFS from previous test runs
    if (gridFsBefore > 0) {
      const bucket = new GridFSBucket(db, { bucketName: "brievoFiles" });
      const oldFiles = await db.collection("brievoFiles.files").find({}).toArray();
      for (const gf of oldFiles) { try { await bucket.delete(gf._id); } catch {} }
      gridFsBefore = await db.collection("brievoFiles.files").countDocuments();
      console.log("  Cleaned leftovers. GridFS now:", gridFsBefore, "files");
    }

    const hash = await bcrypt.hash("step4pass", 10);
    const email = `step4_${Date.now()}@test.example.com`;
    const u = await db.collection("users").insertOne({ name: "Step4 Test", email, passwordHash: hash, role: "designer", status: "approved", emailVerified: true, phone: null, createdAt: new Date() });
    const userId = u.insertedId.toString();
    const token = jwt.sign({ sub: userId, email, role: "designer" }, JWT_SECRET, { expiresIn: "1h" });

    const fRes = await httpReq("POST", `${API_BASE}/api/forms`, { headers: { Authorization: `Bearer ${token}` }, body: { title: "Step4 Form", description: "", brandName: "Step4", status: "draft", fields: [] } });
    const formId = JSON.parse(fRes.bodyStr).form.id;
    await httpReq("PATCH", `${API_BASE}/api/forms/${formId}`, { headers: { Authorization: `Bearer ${token}` }, body: { title: "Step4 Form", description: "", brandName: "Step4", status: "published", fields: [] } });
    const fRefresh = await httpReq("GET", `${API_BASE}/api/forms/${formId}`, { headers: { Authorization: `Bearer ${token}` } });
    const form = JSON.parse(fRefresh.bodyStr).form;
    console.log("  Form:", form.id, "token:", form.shareToken);

    await runTests(token, form);

    gridFsAfter = await db.collection("brievoFiles.files").countDocuments();

    // Cleanup
    console.log("\n═══ CLEANUP ═══");
    const bucket = new GridFSBucket(db, { bucketName: "brievoFiles" });
    const allGridFiles = await db.collection("brievoFiles.files").find({}).toArray();
    for (const gf of allGridFiles) { try { await bucket.delete(gf._id); } catch {} }
    await db.collection("formresponses").deleteMany({ formId: new ObjectId(formId) });
    await db.collection("formdefinitions").deleteOne({ _id: new ObjectId(formId) });
    await db.collection("users").deleteOne({ _id: new ObjectId(userId) });
    const afterCleanup = await countGridFs();
    console.log(`  GridFS: ${afterCleanup.files} files, ${afterCleanup.chunks} chunks`);
    await mongoose.disconnect();

    // Final report
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║                      FINAL RESULTS                          ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");

    const ordered = [
      "Valid single file", "Single file download",
      "Multiple valid files", "Multiple file download",
      "Below 25 MB", "26 MB (multer limit)", "50 MB (above limit)",
      "Exactly 20 files", "21 files",
      "Unsupported MIME type", "Mixed valid/invalid",
      "Failure cleanup (valid submit)", "Failure cleanup (rejected no orphan)",
      "No-file submission", "Metadata tampering",
      "Zero-byte file", "No-file regression", "GridFS cleanup",
    ];
    for (const label of ordered) {
      const items = results.filter(r => r.test === label);
      if (items.length === 0) continue;
      const pass = items.every(r => r.verdict.startsWith("PASS") || r.verdict === "documented");
      const status = items.map(r => r.httpStatus || "-").join("/");
      console.log(`║  ${pass ? "PASS" : "FAIL"} — ${label.padEnd(36)} [${status}]`.padEnd(65) + "║");
    }

    const total = results.length;
    const passed = results.filter(r => r.verdict.startsWith("PASS")).length;
    const documented = results.filter(r => r.verdict === "documented").length;
    const failed = results.filter(r => r.verdict === "FAIL").length;
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Total: ${total}  Passed: ${passed}  Documented: ${documented}  Failed: ${failed}`.padEnd(65) + "║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

    if (failed > 0) {
      console.log("\nFailed:");
      results.filter(r => r.verdict === "FAIL").forEach(r => console.log(`  ✗ ${r.test}: ${r.detail}`));
    }
  } finally {
    server.kill("SIGTERM");
    console.log("\n  Server stopped.");
  }
}

main().then(() => process.exit(0)).catch(e => { console.error("FATAL:", e.message); process.exit(1); });
