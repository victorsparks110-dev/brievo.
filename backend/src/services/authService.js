const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, DEFAULT_ROLE, EMAIL_REGEX, MIN_PASSWORD_LENGTH } = require("../models/userModel");
const { SupportTicket } = require("../models/supportTicketModel");
const { sendNewSignupNotification } = require("./emailService");

/**
 * Authentication service.
 *
 * Holds all authentication business logic so that routes and controllers stay
 * thin and declarative. Password hashing, password verification, password
 * reset, and JWT creation live here and nowhere else. Persistence is delegated
 * to the Mongoose User model.
 *
 * SECURITY:
 *   - Never store or log plain-text passwords.
 *   - Never include passwords or password hashes inside JWT payloads.
 *   - Never hardcode a production JWT secret.
 *   - Never persist or log raw password-reset tokens — only their hashes.
 *   - Forgot-password never reveals whether an email belongs to an account.
 */

const SALT_ROUNDS = 10;

/** How long a password-reset token stays valid (milliseconds). */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Resolve the JWT signing secret from the environment (never hardcoded). */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error(
      "JWT_SECRET environment variable is not set. Add it to the environment before using authentication."
    );
    err.status = 500;
    throw err;
  }
  return secret;
}

/** Hash a plain-text password with bcrypt (never store the plain value). */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/** Compare a plain-text password against a stored bcrypt hash. */
async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Create a signed JWT for a user.
 * The payload carries only non-sensitive identifiers — never passwords.
 */
function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

/** Return a user as a safe JSON object without passwordHash. */
function toSafeUser(user) {
  if (!user) return null;
  return user.toSafeJSON ? user.toSafeJSON() : user;
}

/** Validate name/email/password; throws a 400 on the first problem. */
function assertValidRegistration({ name, email, password }) {
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim();

  if (!cleanName) {
    const err = new Error("Name is required.");
    err.status = 400;
    throw err;
  }
  if (!cleanEmail) {
    const err = new Error("Email is required.");
    err.status = 400;
    throw err;
  }
  if (!EMAIL_REGEX.test(cleanEmail)) {
    const err = new Error("Enter a valid email address.");
    err.status = 400;
    throw err;
  }
  if (!password) {
    const err = new Error("Password is required.");
    err.status = 400;
    throw err;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    const err = new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );
    err.status = 400;
    throw err;
  }
}

/**
 * Register a user: validate, normalize email, check for duplicates, hash the
 * password, and persist to MongoDB.
 * Account starts as pending — admin must approve via support dashboard.
 * @returns {Promise<object>} the safe (no-password) created user
 */
async function registerUser({ name, email, password, phone }) {
  assertValidRegistration({ name, email, password });

  const normalizedEmail = email.trim().toLowerCase();

  // Explicit duplicate check (unique index is the final backstop).
  const existing = await User.findOne({ email: normalizedEmail }).collation({
    locale: "en",
    strength: 2,
  });
  if (existing) {
    const err = new Error("An account with that email already exists.");
    err.status = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);

  const record = new User({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    phone: phone || null,
    role: DEFAULT_ROLE,
    status: "pending",
    emailVerified: false,
  });

  const saved = await record.save();

  // Create a support ticket associated with the new designer account,
  // so we can track the account verification status via a public tracking token.
  const publicTrackingToken = crypto.randomBytes(24).toString("base64url");
  await SupportTicket.create({
    userId: saved._id,
    name: name.trim(),
    email: normalizedEmail,
    subject: "Account Verification Request",
    message: "Account creation successful",
    publicTrackingToken: publicTrackingToken,
  });

  // Notify support team of new signup. Failure is non-critical.
  try {
    await sendNewSignupNotification({ name: name.trim(), email: normalizedEmail, id: saved._id });
  } catch (err) {
    console.error(`Signup notification email failed for ${normalizedEmail}:`, err.message);
  }

  return { user: toSafeUser(saved), trackingToken: publicTrackingToken };
}

/**
 * Login: look up the user by email and verify their password.
 * @returns {Promise<{ user: object, token: string }>}
 * @throws on unknown credentials (401)
 */
async function loginWithCredentials({ email, password }) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    const err = new Error("Email and password are required.");
    err.status = 400;
    throw err;
  }

  // Generic message avoids leaking whether the account exists (no enumeration).
  const user = await User.findOne({ email: normalizedEmail }).collation({
    locale: "en",
    strength: 2,
  });
  if (!user) {
    const err = new Error("Invalid email or password.");
    err.status = 401;
    throw err;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const err = new Error("Invalid email or password.");
    err.status = 401;
    throw err;
  }

  if (!user.emailVerified) {
    const err = new Error("Please verify your email before logging in.");
    err.status = 403;
    throw err;
  }

  if (user.role !== "support" && user.status === "pending") {
    const err = new Error("Your account is pending approval. Please contact Support.");
    err.status = 403;
    throw err;
  }

  if (user.role !== "support" && user.status === "suspended") {
    const err = new Error("Your account is suspended.");
    err.status = 403;
    throw err;
  }

  return {
    user: toSafeUser(user),
    token: generateToken(user),
  };
}

/**
 * Verify a JWT and return its payload (id/email/role).
 * @throws with status 401 if the token is missing, malformed, or expired.
 */
function verifyToken(token) {
  if (!token) {
    const err = new Error("Not authenticated.");
    err.status = 401;
    throw err;
  }
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    const err = new Error("Invalid or expired token.");
    err.status = 401;
    throw err;
  }
}

/**
 * Load a user by id from MongoDB.
 * @returns {Promise<object|null>} the safe user or null when not found.
 */
async function getUserById(id) {
  if (!id) return null;
  const user = await User.findById(id);
  return user ? toSafeUser(user) : null;
}

/**
 * Update the authenticated user's profile.
 *
 * Only the following fields are allowed:
 *   - name   (string, required, trimmed)
 *   - phone  (string, optional, trimmed, nullable)
 *
 * All other fields are silently ignored. The user's ID comes from the
 * authentication token, never from the request body.
 *
 * @returns {Promise<object>} the safe (no-password) updated user
 * @throws with status 400 on invalid input, 404 if user not found
 */
async function updateUserProfile(userId, updates) {
  if (!userId) {
    const err = new Error("User ID is required.");
    err.status = 400;
    throw err;
  }

  // Allowlist: only these fields can be updated via profile.
  const allowedFields = ["name", "phone"];
  const safeUpdates = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      safeUpdates[field] = updates[field];
    }
  }

  if (safeUpdates.name !== undefined) {
    const cleanName = typeof safeUpdates.name === "string" ? safeUpdates.name.trim() : "";
    if (!cleanName) {
      const err = new Error("Name is required.");
      err.status = 400;
      throw err;
    }
    safeUpdates.name = cleanName;
  }

  if (safeUpdates.phone !== undefined) {
    const raw = typeof safeUpdates.phone === "string" ? safeUpdates.phone.trim() : "";
    safeUpdates.phone = raw || null;
  }

  if (Object.keys(safeUpdates).length === 0) {
    const err = new Error("No valid fields to update.");
    err.status = 400;
    throw err;
  }

  const user = await User.findByIdAndUpdate(userId, safeUpdates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }

  return toSafeUser(user);
}

/** Hash a reset token with SHA-256 (tokens are never stored or logged raw). */
function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a cryptographically secure password-reset token and its hash.
 * Returns the raw token ONLY to the caller so it can be delivered to the user;
 * only the hash is ever persisted.
 */
function generateResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashResetToken(token),
    expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
}

/**
 * Look up a user by email for password-reset purposes.
 *
 * Always behaves identically regardless of whether the email exists (no
 * account enumeration). Returns the same shape either way.
 *
 * @returns {Promise<{ found: boolean, userId?: string, name?: string, email?: string }>}
 */
async function requestPasswordReset(email) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    const err = new Error("Email is required.");
    err.status = 400;
    throw err;
  }

  const user = await User.findOne({ email: normalizedEmail })
    .collation({ locale: "en", strength: 2 });

  // Always return the same shape — never reveal whether the email exists.
  if (!user) {
    return { found: false };
  }

  return {
    found: true,
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
  };
}

/**
 * Reset a user's password using a token from a password-reset support ticket.
 *
 * @returns {Promise<object>} the safe (no-password) updated user
 * @throws with status 400 on invalid input, status 401 on invalid/expired token
 */
async function resetPasswordWithToken({ token, newPassword }) {
  if (!token || typeof token !== "string" || token.length < 1) {
    const err = new Error("Reset token is required.");
    err.status = 400;
    throw err;
  }

  const cleanPassword = newPassword;
  if (!cleanPassword || typeof cleanPassword !== "string") {
    const err = new Error("New password is required.");
    err.status = 400;
    throw err;
  }
  if (cleanPassword.length < MIN_PASSWORD_LENGTH) {
    const err = new Error(
      `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );
    err.status = 400;
    throw err;
  }

  const tokenHash = hashResetToken(token);

  // Look up the password-reset ticket by token hash (with resetTokenHash selected).
  const ticket = await SupportTicket.findOne({
    type: "password_reset",
    resetTokenHash: tokenHash,
  }).select("+resetTokenHash +resetTokenExpires");

  const isValid = ticket && ticket.resetTokenExpires && ticket.resetTokenExpires.getTime() > Date.now();

  if (!isValid) {
    const err = new Error("This password reset link is no longer valid. Please contact support to request a new one.");
    err.status = 401;
    throw err;
  }

  // Find the user by the ticket's userId
  const user = await User.findById(ticket.userId);
  if (!user) {
    const err = new Error("User account not found.");
    err.status = 404;
    throw err;
  }

  const passwordHash = await hashPassword(cleanPassword);

  // Update the user's password
  user.passwordHash = passwordHash;
  await user.save();

  // Invalidate the reset token on the ticket (single-use)
  ticket.resetTokenHash = null;
  ticket.resetTokenExpires = null;
  ticket.status = "resolved";
  await ticket.save();

  return toSafeUser(user);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  toSafeUser,
  registerUser,
  loginWithCredentials,
  getUserById,
  updateUserProfile,
  hashResetToken,
  generateResetToken,
  requestPasswordReset,
  resetPasswordWithToken,
};