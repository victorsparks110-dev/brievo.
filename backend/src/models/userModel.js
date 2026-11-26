const mongoose = require("mongoose");

/**
 * User model.
 *
 * Real Mongoose schema persisted to MongoDB. The controller/service layer must
 * never touch passwordHash or return it to clients — only the bcrypt hash is
 * stored, never a plain-text password.
 *
 * Fields:
 *   - name                       full name (required)
 *   - email                      email address (required, unique, normalized to lowercase)
 *   - passwordHash               bcrypt hash of the password (required)
 *   - role                       account role (default: "designer")
 *   - createdAt                  ISO timestamp (defaults to now)
 *   - passwordResetTokenHash     sha-256 of an active reset token (optional)
 *   - passwordResetExpires       expiry timestamp of the active reset token (optional)
 *   - emailVerified              whether the user's email has been verified (default: false)
 *   - verificationCodeHash       sha-256 of an active verification code (optional)
 *   - verificationCodeExpires    expiry timestamp of the active verification code (optional)
 *
 * Only the hash of a reset token is stored — the raw token is never persisted
 * and never returned.
 */

const USER_STATUSES = ["pending", "approved", "suspended"];

const DEFAULT_STATUS = "pending";
const DEFAULT_ROLE = "designer";
const ALLOWED_ROLES = ["designer", "support"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [EMAIL_REGEX, "Enter a valid email address."],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required."],
    },
    role: {
      type: String,
      enum: ALLOWED_ROLES,
      default: DEFAULT_ROLE,
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: DEFAULT_STATUS,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationCodeHash: {
      type: String,
      default: null,
      select: false,
    },
    verificationCodeExpires: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

/**
 * Convert a Mongoose document into a plain, safe object for JSON responses.
 * Maps Mongo's _id to id and strips passwordHash and reset-token fields.
 */
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id ? this._id.toString() : undefined,
    name: this.name,
    email: this.email,
    phone: this.phone || undefined,
    role: this.role,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);

module.exports = {
  User,
  DEFAULT_ROLE,
  ALLOWED_ROLES,
  EMAIL_REGEX,
  MIN_PASSWORD_LENGTH,
};
