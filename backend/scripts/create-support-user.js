/**
 * Development-only script to create a support-role user.
 *
 * This script MUST NOT be imported by server.js or any production code.
 * It is invoked manually via:  npm run create-support-user
 *
 * The script refuses to run if NODE_ENV=production.
 *
 * Credentials are read from environment variables or entered interactively:
 *   SUPPORT_USER_EMAIL     – the support account email
 *   SUPPORT_USER_NAME      – the display name
 *   SUPPORT_USER_PASSWORD  – the password (never stored in source)
 *
 * The created user has:
 *   - role: "support"
 *   - emailVerified: true  (no email verification required for dev accounts)
 */

const path = require("path");
const readline = require("readline");

// ── Hard safety gate ────────────────────────────────────────────────────────
const NODE_ENV = process.env.NODE_ENV || "development";
if (NODE_ENV === "production") {
  console.error(
    "FATAL: This script is for development use only and cannot run in production."
  );
  process.exit(1);
}

// ── Load environment variables from backend/.env ────────────────────────────
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const { connectDatabase, disconnectDatabase, safeMessage } = require("../src/config/database");
const { User, ALLOWED_ROLES } = require("../src/models/userModel");

const SUPPORT_ROLE = "support";

// ── Validate that the role is allowed by the model ─────────────────────────
if (!ALLOWED_ROLES.includes(SUPPORT_ROLE)) {
  console.error(
    `FATAL: Role "${SUPPORT_ROLE}" is not in the allowed roles list: ${ALLOWED_ROLES.join(", ")}`
  );
  process.exit(1);
}

// ── Interactive prompt helper ───────────────────────────────────────────────
// Uses a single readline interface that stays open across all prompts and is
// closed once after all input is collected. This avoids the "readline was
// closed" error that occurs when rl.close() is called inside each prompt.
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function askPassword(rl, question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    let password = "";

    // Put stdin into raw mode so we receive each keystroke individually.
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function onData(chunk) {
      const char = chunk.toString();

      // Enter — finish
      if (char === "\n" || char === "\r") {
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(password);
        return;
      }

      // Ctrl+C — abort
      if (char === "\u0003") {
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        process.exit(130);
        return;
      }

      // Backspace / Delete
      if (char === "\u007F" || char === "\b" || char === "\u001B[3~") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }

      // Ignore other control characters (escape sequences, arrows, etc.)
      if (char.length > 1 || char.charCodeAt(0) < 32) {
        return;
      }

      password += char;
      process.stdout.write("*");
    }

    process.stdin.on("data", onData);
  });
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Collect credentials from env vars or interactive input
  let email = process.env.SUPPORT_USER_EMAIL || "";
  let name = process.env.SUPPORT_USER_NAME || "";
  let password = process.env.SUPPORT_USER_PASSWORD || "";

  // Create a single readline interface that stays open for all prompts.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    if (!email) {
      email = await askQuestion(rl, "Support account email: ");
    }
    if (!name) {
      name = await askQuestion(rl, "Display name: ");
    }
    if (!password) {
      password = await askPassword(rl, "Password (hidden): ");
    }
  } finally {
    // Close readline exactly once, after all prompts are done.
    rl.close();
  }

  // 2. Validate inputs
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    console.error("ERROR: A valid email address is required.");
    process.exit(1);
  }
  if (!trimmedName) {
    console.error("ERROR: A display name is required.");
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error("ERROR: Password must be at least 8 characters.");
    process.exit(1);
  }

  // 3. Connect to MongoDB
  console.log("\nConnecting to MongoDB...");
  try {
    await connectDatabase();
  } catch (err) {
    console.error(`Failed to connect to MongoDB: ${safeMessage(err)}`);
    process.exit(1);
  }

  // 4. Check if the email already exists
  try {
    const existing = await User.findOne({ email: normalizedEmail }).collation({
      locale: "en",
      strength: 2,
    });
    if (existing) {
      console.log(
        `\nAn account with the email "${normalizedEmail}" already exists (role: ${existing.role}).`
      );
      console.log("No duplicate account was created.");
      await disconnectDatabase();
      process.exit(0);
    }
  } catch (err) {
    console.error(`Error checking for existing user: ${safeMessage(err)}`);
    await disconnectDatabase();
    process.exit(1);
  }

  // 5. Hash password and create the user
  const SALT_ROUNDS = 10;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = new User({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      role: SUPPORT_ROLE,
      emailVerified: true,
    });

    const saved = await user.save();

    console.log("\n─────────────────────────────────────────────");
    console.log("  Support account created successfully");
    console.log("─────────────────────────────────────────────");
    console.log(`  Email : ${saved.email}`);
    console.log(`  Name  : ${saved.name}`);
    console.log(`  Role  : ${saved.role}`);
    console.log(`  ID    : ${saved._id}`);
    console.log("─────────────────────────────────────────────");
    console.log(
      "\nYou can now log in through the Brievo frontend using this email and password."
    );
    console.log(
      "The account is pre-verified, so no email verification code is needed.\n"
    );
  } catch (err) {
    console.error(`Failed to create support account: ${safeMessage(err)}`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error(`Unexpected error: ${safeMessage(err)}`);
  process.exit(1);
});
