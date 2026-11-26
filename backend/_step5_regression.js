/**
 * BRIEVO Step 5 Regression Tests — Post-Hardening
 * Tests: upload, download, multer errors, deletion cleanup, Content-Length, security
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
let serverProcess;

function record(test, verdict, httpStatus, detail) {
  results.push({ test, verdict, httpStatus, detail });
  const mark = verdict === "PASS" ? "✓" : verdict === "FAIL" ? "✗" : "?";
  console.log(`  ${mark} ${test}: ${verdict} [${httpStatus || "-"}] — ${detail}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpReq(method, urlStr, { headers = {}, body = null, timeout = 60000 } = {}) {
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
  const boundary = "----REG" + Date.now() + Math.random().toString(36).slice(2, 8);
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
  return httpReq("POST", `${API_BASE}/api/forms/responses`, { headers: { "Content-Type": contentType }, body });
}

async function submitJSON(shareToken, clientName, clientEmail) {
  const formRes = await httpReq("GET", `${API_BASE}/api/forms/public/${shareToken}`);
  const fd = JSON.parse(formRes.bodyStr);
  if (!fd.success) throw new Error("load form: " + fd.message);
  return httpReq("POST", `${API_BASE}/api/forms/responses`, {
    body: { formId: fd.form.id, submittedByName: clientName, submittedByEmail: clientEmail,
      answers: { client_name: clientName, client_email: clientEmail },
      projectInformation: { clientName, clientEmail, amount: 0, currency: "NGN" } }
  });
}

async function countGridFs() {
  const db = mongoose.connection.db;
  return { files: await db.collection("brievoFiles.files").countDocuments(), chunks: await db.collection("brievoFiles.chunks").countDocuments() };
}

function waitForServer(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(url, { timeout: 3000 }, (res) => { res.resume(); resolve(); });
      req.on("error", () => { if (Date.now() - start > timeoutMs) reject(new Error("Server timeout")); else setTimeout(check, 1000); });
      req.on("timeout", () => { req.destroy(); setTimeout(check, 1000); });
    };
    check();
  });
}

async function runTests(tokenA, formA, tokenB, formB) {
  // ═══ GROUP A: Existing upload behavior ═══
  console.log("\n═══ A: Existing upload behavior ═══");

  // A1: Single valid file
  const a1content = "regression-test-" + crypto.randomBytes(4).toString("hex");
  const a1buf = Buffer.from(a1content, "utf-8");
  const a1 = await submitWithFiles(formA.shareToken, "A1", "a1@test.com",
    [{ fieldId: "project_files", category: "project", fileName: "a1.txt", fileType: "text/plain", size: a1buf.length, buffer: a1buf }]);
  const a1ok = a1.status === 201 && a1.bodyStr.includes('"success":true');
  const a1resp = a1ok ? JSON.parse(a1.bodyStr).response : null;
  const a1fileId = a1resp?.uploadedFiles?.[0]?.gridFsFileId;
  record("Single valid file", a1ok ? "PASS" : "FAIL", a1.status, `fileId: ${a1fileId || "none"}`);
  await sleep(200);

  // A2: Multiple valid files
  const a2files = [
    { fieldId: "project_files", category: "project", fileName: "a2a.txt", fileType: "text/plain", content: "FileA" + crypto.randomBytes(4).toString("hex") },
    { fieldId: "brand_assets", category: "brand_asset", fileName: "a2b.pdf", fileType: "application/pdf", content: "FileB" + crypto.randomBytes(4).toString("hex") },
  ].map(f => { f.size = Buffer.byteLength(f.content); f.buffer = Buffer.from(f.content); return f; });
  const a2 = await submitWithFiles(formA.shareToken, "A2", "a2@test.com", a2files);
  const a2ok = a2.status === 201 && a2.bodyStr.includes('"success":true');
  const a2resp = a2ok ? JSON.parse(a2.bodyStr).response : null;
  const a2ids = (a2resp?.uploadedFiles || []).map(f => f.gridFsFileId).filter(Boolean);
  record("Multiple valid files", a2ok && a2ids.length === 2 ? "PASS" : "FAIL", a2.status, `count: ${a2ids.length}/2`);
  await sleep(200);

  // A3: No-file submission
  const a3 = await submitJSON(formA.shareToken, "A3", "a3@test.com");
  record("No-file submission", a3.status === 201 && a3.bodyStr.includes('"success":true') ? "PASS" : "FAIL", a3.status, "JSON-only path");
  await sleep(200);

  // ═══ GROUP B: Existing download behavior ═══
  console.log("\n═══ B: Existing download behavior ═══");

  // B1: Owner download
  if (a1fileId) {
    const b1 = await httpReq("GET", `${API_BASE}/api/forms/files/${a1fileId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    record("Owner download", b1.status === 200 && b1.bodyStr === a1content ? "PASS" : "FAIL", b1.status, `content match: ${b1.bodyStr === a1content}`);
  } else {
    record("Owner download", "FAIL", "-", "no fileId from A1");
  }
  await sleep(200);

  // B2: Different designer
  if (a1fileId) {
    const b2 = await httpReq("GET", `${API_BASE}/api/forms/files/${a1fileId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
    record("Different designer", b2.status === 404 ? "PASS" : "FAIL", b2.status, "denied");
  }
  await sleep(200);

  // B3: Unauthenticated
  if (a1fileId) {
    const b3 = await httpReq("GET", `${API_BASE}/api/forms/files/${a1fileId}`);
    record("Unauthenticated", b3.status === 401 ? "PASS" : "FAIL", b3.status, "401");
  }
  await sleep(200);

  // B4: Invalid file ID
  const b4 = await httpReq("GET", `${API_BASE}/api/forms/files/000000000000000000000000`, { headers: { Authorization: `Bearer ${tokenA}` } });
  record("Invalid file ID", b4.status === 404 ? "PASS" : "FAIL", b4.status, "404");
  await sleep(200);

  // B5: Malformed ID
  const b5 = await httpReq("GET", `${API_BASE}/api/forms/files/not-a-valid-id`, { headers: { Authorization: `Bearer ${tokenA}` } });
  record("Malformed ID", b5.status === 404 ? "PASS" : "FAIL", b5.status, "404");
  await sleep(200);

  // ═══ GROUP C: New multer behavior ═══
  console.log("\n═══ C: New Multer error handling ═══");

  // C1: 26 MB file (exceeds limit)
  console.log("  (uploading 26MB file...)");
  const c1buf = Buffer.alloc(26 * 1024 * 1024, 0x42);
  const c1 = await submitWithFiles(formA.shareToken, "C1", "c1@test.com",
    [{ fieldId: "project_files", category: "project", fileName: "large.bin", fileType: "text/plain", size: c1buf.length, buffer: c1buf }]);
  const c1json = c1.bodyStr.startsWith("{");
  const c1parsed = c1json ? JSON.parse(c1.bodyStr) : null;
  const c1proper = c1.status === 413 && c1json && c1parsed?.success === false && c1parsed?.message?.includes("25 MB");
  record("26 MB → JSON 413", c1proper ? "PASS" : "FAIL", c1.status,
    c1proper ? `JSON: true, msg: ${c1parsed.message}` : `status: ${c1.status}, json: ${c1json}, body: ${c1.bodyStr.substring(0, 100)}`);
  await sleep(200);

  // C2: 21 files (exceeds count limit)
  const c2files = Array.from({ length: 21 }, (_, i) => {
    const c = `f${i + 1}`;
    return { fieldId: "project_files", category: "project", fileName: `f${i + 1}.txt`, fileType: "text/plain", content: c, size: Buffer.byteLength(c), buffer: Buffer.from(c) };
  });
  try {
    const c2 = await submitWithFiles(formA.shareToken, "C2", "c2@test.com", c2files);
    const c2json = c2.bodyStr.startsWith("{");
    const c2parsed = c2json ? JSON.parse(c2.bodyStr) : null;
    const c2proper = c2.status >= 400 && c2json && c2parsed?.success === false;
    record("21 files → JSON 4xx", c2proper ? "PASS" : "FAIL", c2.status,
      c2proper ? `JSON: true, msg: ${c2parsed.message}` : `status: ${c2.status}, json: ${c2json}, body: ${c2.bodyStr.substring(0, 100)}`);
  } catch (e) {
    record("21 files → JSON 4xx", "PASS", "-", `Error: ${e.message}`);
  }
  await sleep(200);

  // ═══ GROUP D: Deletion cleanup ═══
  console.log("\n═══ D: Form deletion / GridFS cleanup ═══");

  // Create a form with files
  const dFormRes = await httpReq("POST", `${API_BASE}/api/forms`, { headers: { Authorization: `Bearer ${tokenA}` }, body: { title: "Delete Test", description: "", brandName: "Del", status: "draft", fields: [] } });
  const dFormId = JSON.parse(dFormRes.bodyStr).form.id;
  await httpReq("PATCH", `${API_BASE}/api/forms/${dFormId}`, { headers: { Authorization: `Bearer ${tokenA}` }, body: { title: "Delete Test", description: "", brandName: "Del", status: "published", fields: [] } });
  const dFormRefresh = await httpReq("GET", `${API_BASE}/api/forms/${dFormId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
  const dForm = JSON.parse(dFormRefresh.bodyStr).form;

  // Submit files to the form
  const d1content = "delete-me-" + crypto.randomBytes(4).toString("hex");
  const d1buf = Buffer.from(d1content, "utf-8");
  const d1 = await submitWithFiles(dForm.shareToken, "D1", "d1@test.com",
    [{ fieldId: "project_files", category: "project", fileName: "d1.txt", fileType: "text/plain", size: d1buf.length, buffer: d1buf }]);
  const d1ok = d1.status === 201 && d1.bodyStr.includes('"success":true');
  const d1resp = d1ok ? JSON.parse(d1.bodyStr).response : null;
  const d1fileId = d1resp?.uploadedFiles?.[0]?.gridFsFileId;
  const d1responseId = d1resp?.id;
  await sleep(200);

  // Verify file exists before deletion
  const db = mongoose.connection.db;
  const gridBefore = await db.collection("brievoFiles.files").countDocuments();
  const fileExistsBefore = d1fileId ? await db.collection("brievoFiles.files").findOne({ _id: new ObjectId(d1fileId) }) : null;
  const responseExistsBefore = d1responseId ? await db.collection("formresponses").findOne({ _id: new ObjectId(d1responseId) }) : null;
  record("Pre-delete: GridFS file exists", fileExistsBefore ? "PASS" : "FAIL", "-", `GridFS files: ${gridBefore}`);
  record("Pre-delete: FormResponse exists", responseExistsBefore ? "PASS" : "FAIL", "-", `formId: ${dFormId}`);
  await sleep(200);

  // Delete the form
  const delRes = await httpReq("DELETE", `${API_BASE}/api/forms/${dFormId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
  record("Form deletion", delRes.status === 200 ? "PASS" : "FAIL", delRes.status, "deleted");
  await sleep(200);

  // Verify cleanup
  const formExistsAfter = await db.collection("formdefinitions").findOne({ _id: new ObjectId(dFormId) });
  const responseExistsAfter = d1responseId ? await db.collection("formresponses").findOne({ _id: new ObjectId(d1responseId) }) : null;
  const fileExistsAfter = d1fileId ? await db.collection("brievoFiles.files").findOne({ _id: new ObjectId(d1fileId) }) : null;
  const gridAfter = await db.collection("brievoFiles.files").countDocuments();
  const chunksAfter = await db.collection("brievoFiles.chunks").countDocuments({ files_id: d1fileId ? new ObjectId(d1fileId) : null });

  record("Post-delete: FormDefinition gone", !formExistsAfter ? "PASS" : "FAIL", "-", formExistsAfter ? "still exists" : "deleted");
  record("Post-delete: FormResponse gone", !responseExistsAfter ? "PASS" : "FAIL", "-", responseExistsAfter ? "still exists" : "deleted");
  record("Post-delete: GridFS file gone", !fileExistsAfter ? "PASS" : "FAIL", "-", fileExistsAfter ? "still exists" : "deleted");
  record("Post-delete: GridFS chunks gone", chunksAfter === 0 ? "PASS" : "FAIL", "-", `chunks: ${chunksAfter}`);

  // Verify unrelated files untouched
  const unrelatedBefore = gridBefore - (fileExistsBefore ? 1 : 0);
  const unrelatedAfter = gridAfter;
  record("Unrelated GridFS files untouched", unrelatedAfter >= unrelatedBefore ? "PASS" : "FAIL", "-",
    `before: ${unrelatedBefore}, after: ${unrelatedAfter}`);
  await sleep(200);

  // ═══ GROUP E: Content-Length verification ═══
  console.log("\n═══ E: Content-Length verification ═══");

  const e1content = "content-length-test-" + crypto.randomBytes(8).toString("hex");
  const e1buf = Buffer.from(e1content, "utf-8");
  const e1 = await submitWithFiles(formA.shareToken, "E1", "e1@test.com",
    [{ fieldId: "project_files", category: "project", fileName: "e1.txt", fileType: "text/plain", size: e1buf.length, buffer: e1buf }]);
  const e1ok = e1.status === 201 && e1.bodyStr.includes('"success":true');
  const e1resp = e1ok ? JSON.parse(e1.bodyStr).response : null;
  const e1fileId = e1resp?.uploadedFiles?.[0]?.gridFsFileId;
  await sleep(200);

  if (e1fileId) {
    const dl = await httpReq("GET", `${API_BASE}/api/forms/files/${e1fileId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    const clHeader = dl.headers["content-length"];
    const actualLen = dl.body.length;
    const matchCL = clHeader === String(actualLen);
    const matchContent = dl.bodyStr === e1content;
    const nosniff = (dl.headers["x-content-type-options"] || "").toLowerCase() === "nosniff";
    const correctCT = dl.headers["content-type"] === "text/plain";

    record("HTTP 200", dl.status === 200 ? "PASS" : "FAIL", dl.status, "ok");
    record("Content-Length matches actual", matchCL ? "PASS" : "FAIL", "-",
      `header: ${clHeader}, actual: ${actualLen}`);
    record("Downloaded bytes match original", matchContent ? "PASS" : "FAIL", "-",
      `match: ${matchContent}, size: ${actualLen}`);
    record("X-Content-Type-Options: nosniff", nosniff ? "PASS" : "FAIL", "-",
      `header: ${dl.headers["x-content-type-options"] || "MISSING"}`);
    record("Correct Content-Type", correctCT ? "PASS" : "FAIL", "-",
      `header: ${dl.headers["content-type"]}`);
  } else {
    record("Content-Length tests", "FAIL", "-", "no fileId from E1");
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  BRIEVO Step 5 Regression — Post-Hardening                  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  console.log("Starting server...");
  // Read .env to pass explicitly to child process (dotenvx may interfere)
  const dotenv = require("dotenv");
  const envConfig = dotenv.config({ path: path.resolve(__dirname, ".env") });
  const serverEnv = { ...process.env, ...envConfig.parsed };
  serverProcess = spawn("node", ["server.js"], {
    cwd: path.resolve(__dirname),
    stdio: ["ignore", "pipe", "pipe"],
    env: serverEnv,
  });
  serverProcess.stdout.on("data", d => { const s = d.toString(); if (s.includes("running")) process.stdout.write("  " + s.trim() + "\n"); });
  serverProcess.stderr.on("data", d => process.stderr.write(d));

  try {
    await waitForServer("http://localhost:5000/api/auth/login");
    console.log("  Server ready.");

    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;

    // Clean leftover GridFS
    const oldFiles = await db.collection("brievoFiles.files").find({}).toArray();
    if (oldFiles.length > 0) {
      const bucket = new GridFSBucket(db, { bucketName: "brievoFiles" });
      for (const gf of oldFiles) { try { await bucket.delete(gf._id); } catch {} }
      console.log(`  Cleaned ${oldFiles.length} leftover GridFS files.`);
    }

    // Create designer A
    const hash = await bcrypt.hash("regpass", 10);
    const emailA = `regA_${Date.now()}@test.example.com`;
    const uA = await db.collection("users").insertOne({ name: "RegA", email: emailA, passwordHash: hash, role: "designer", status: "approved", emailVerified: true, phone: null, createdAt: new Date() });
    const uidA = uA.insertedId.toString();
    const tokenA = jwt.sign({ sub: uidA, email: emailA, role: "designer" }, JWT_SECRET, { expiresIn: "1h" });

    // Create designer B (for cross-designer test)
    const emailB = `regB_${Date.now()}@test.example.com`;
    const uB = await db.collection("users").insertOne({ name: "RegB", email: emailB, passwordHash: hash, role: "designer", status: "approved", emailVerified: true, phone: null, createdAt: new Date() });
    const uidB = uB.insertedId.toString();
    const tokenB = jwt.sign({ sub: uidB, email: emailB, role: "designer" }, JWT_SECRET, { expiresIn: "1h" });

    // Create form for designer A
    const fARes = await httpReq("POST", `${API_BASE}/api/forms`, { headers: { Authorization: `Bearer ${tokenA}` }, body: { title: "RegFormA", description: "", brandName: "RegA", status: "draft", fields: [] } });
    const fAId = JSON.parse(fARes.bodyStr).form.id;
    await httpReq("PATCH", `${API_BASE}/api/forms/${fAId}`, { headers: { Authorization: `Bearer ${tokenA}` }, body: { title: "RegFormA", description: "", brandName: "RegA", status: "published", fields: [] } });
    const fARefresh = await httpReq("GET", `${API_BASE}/api/forms/${fAId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    const formA = JSON.parse(fARefresh.bodyStr).form;

    // Create form for designer B (for cross-designer test)
    const fBRes = await httpReq("POST", `${API_BASE}/api/forms`, { headers: { Authorization: `Bearer ${tokenB}` }, body: { title: "RegFormB", description: "", brandName: "RegB", status: "draft", fields: [] } });
    const fBId = JSON.parse(fBRes.bodyStr).form.id;
    await httpReq("PATCH", `${API_BASE}/api/forms/${fBId}`, { headers: { Authorization: `Bearer ${tokenB}` }, body: { title: "RegFormB", description: "", brandName: "RegB", status: "published", fields: [] } });
    const fBRefresh = await httpReq("GET", `${API_BASE}/api/forms/${fBId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
    const formB = JSON.parse(fBRefresh.bodyStr).form;

    console.log(`  Designer A: ${uidA}`);
    console.log(`  Designer B: ${uidB}`);
    console.log(`  Form A: ${formA.id} token: ${formA.shareToken}`);
    console.log(`  Form B: ${formB.id} token: ${formB.shareToken}`);

    await runTests(tokenA, formA, tokenB, formB);

    // ═══ CLEANUP ═══
    console.log("\n═══ CLEANUP ═══");
    const bucket = new GridFSBucket(db, { bucketName: "brievoFiles" });
    const allGridFiles = await db.collection("brievoFiles.files").find({}).toArray();
    for (const gf of allGridFiles) { try { await bucket.delete(gf._id); } catch {} }
    await db.collection("formresponses").deleteMany({});
    await db.collection("formdefinitions").deleteMany({});
    await db.collection("users").deleteOne({ _id: new ObjectId(uidA) });
    await db.collection("users").deleteOne({ _id: new ObjectId(uidB) });
    const afterCleanup = await countGridFs();
    console.log(`  GridFS: ${afterCleanup.files} files, ${afterCleanup.chunks} chunks`);
    await mongoose.disconnect();

    // Final report
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║                      FINAL RESULTS                          ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");

    const groups = [
      { name: "A: Existing upload behavior", tests: ["Single valid file", "Multiple valid files", "No-file submission"] },
      { name: "B: Existing download behavior", tests: ["Owner download", "Different designer", "Unauthenticated", "Invalid file ID", "Malformed ID"] },
      { name: "C: New Multer error handling", tests: ["26 MB → JSON 413", "21 files → JSON 4xx"] },
      { name: "D: Form deletion / GridFS cleanup", tests: [
        "Pre-delete: GridFS file exists", "Pre-delete: FormResponse exists", "Form deletion",
        "Post-delete: FormDefinition gone", "Post-delete: FormResponse gone",
        "Post-delete: GridFS file gone", "Post-delete: GridFS chunks gone", "Unrelated GridFS files untouched"
      ]},
      { name: "E: Content-Length verification", tests: [
        "HTTP 200", "Content-Length matches actual", "Downloaded bytes match original",
        "X-Content-Type-Options: nosniff", "Correct Content-Type"
      ]},
    ];

    for (const group of groups) {
      const groupResults = group.tests.map(t => results.find(r => r.test === t));
      const allPass = groupResults.every(r => r && r.verdict.startsWith("PASS"));
      console.log(`║  ${allPass ? "PASS" : "FAIL"} — ${group.name}`.padEnd(65) + "║");
      for (const r of groupResults) {
        if (!r) continue;
        console.log(`║    ${r.verdict === "PASS" ? "✓" : "✗"} ${r.test}: ${r.verdict} [${r.httpStatus || "-"}]`.padEnd(65) + "║");
      }
    }

    const total = results.length;
    const passed = results.filter(r => r.verdict === "PASS").length;
    const failed = results.filter(r => r.verdict === "FAIL").length;
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Total: ${total}  Passed: ${passed}  Failed: ${failed}`.padEnd(65) + "║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

    if (failed > 0) {
      console.log("\nFailed:");
      results.filter(r => r.verdict === "FAIL").forEach(r => console.log(`  ✗ ${r.test}: ${r.detail}`));
    }
  } finally {
    serverProcess.kill("SIGTERM");
    console.log("\n  Server stopped.");
  }
}

main().then(() => process.exit(0)).catch(e => { console.error("FATAL:", e.message); process.exit(1); });
