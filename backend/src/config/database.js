const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables from backend/.env so MONGODB_URI, JWT_SECRET,
// and PORT are available without hardcoding anything in source files.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Database connection module.
 *
 * Connects a Mongoose instance to MongoDB Atlas using process.env.MONGODB_URI.
 *
 * SECURITY:
 *   - The connection string and password are NEVER logged or printed.
 *   - Only a sanitized, human-readable message is shown on failure.
 */

/** Establish the MongoDB connection. Resolves once connected. */
async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const err = new Error(
      "MONGODB_URI is not set. Add it to backend/.env to connect the database."
    );
    err.name = "ConfigError";
    throw err;
  }

  mongoose.connection.on("connected", () => {
    // Safe, credential-free message.
    console.log("MongoDB connected successfully.");
  });

  mongoose.connection.on("error", (err) => {
    // Never print the URI, username, password, or host in server logs.
    console.error(`MongoDB connection error: ${safeMessage(err)}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected.");
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

/** Produce a sanitized error/exit message that never leaks credentials. */
function safeMessage(err) {
  const name = (err && err.name) || "Error";
  const reason = (err && err.reason && err.reason.message) || (err && err.message);
  // If the reason reveals anything about the URI/credentials, fall back to a generic message.
  if (!reason || /mongodb(\+srv)?:\/\/|password|pwd=/.test(reason)) {
    return "Unable to connect to MongoDB. Check the connection string and network access.";
  }
  return `${name}: ${reason}`;
}

/** Gracefully close the connection (e.g. on shutdown). */
async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}

module.exports = { connectDatabase, disconnectDatabase, safeMessage };
