const mongoose = require("mongoose");

/**
 * Support ticket model.
 *
 * Stores contact/support requests and password-reset requests.
 * Tickets can be created by authenticated or unauthenticated users.
 *
 * Fields:
 *   - userId     ID of the authenticated user (null for unauthenticated requests)
 *   - type       ticket type: "contact" (default) or "password_reset"
 *   - name       submitter's display name (required)
 *   - email      submitter's email (required)
 *   - subject    ticket subject (required)
 *   - message    ticket body (required)
 *   - status     workflow status (default: "new")
 *   - response   support team reply (null until answered)
 *
 * Password-reset-only fields:
 *   - resetTokenHash        SHA-256 hash of the one-time reset token
 *   - resetTokenExpires     expiry date of the reset token
 *   - resetLinkGeneratedAt  when support generated the reset link
 *   - repliedAt             when support sent the email reply
 *   - repliedBy             support agent who sent the reply (ObjectId ref User)
 *   - emailSubject          subject line of the sent email
 *   - emailMessage          body of the sent email
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_STATUSES = ["new", "in_progress", "answered", "resolved"];
const ALLOWED_TYPES = ["contact", "password_reset"];
const PASSWORD_RESET_STATUSES = ["new", "in_progress", "reset_link_generated", "replied", "resolved"];

const supportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ALLOWED_TYPES,
      default: "contact",
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, "Enter a valid email address."],
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required."],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required."],
      trim: true,
    },
    status: {
      type: String,
      enum: ALLOWED_STATUSES,
      default: "new",
    },
    response: {
      type: String,
      default: null,
      trim: true,
    },
    publicTrackingToken: {
      type: String,
    },

    // Password-reset-only fields
    resetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    resetTokenExpires: {
      type: Date,
      default: null,
      select: false,
    },
    resetLinkGeneratedAt: {
      type: Date,
      default: null,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    emailSubject: {
      type: String,
      default: null,
    },
    emailMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

supportTicketSchema.index({ type: 1, status: 1 });

/**
 * Convert a Mongoose document into a plain object for JSON responses.
 * Maps _id to id for consistency with the frontend.
 * Strips resetTokenHash and resetTokenExpires from normal queries.
 */
supportTicketSchema.methods.toJSON = function toJSON() {
  return {
    id: this._id ? this._id.toString() : undefined,
    userId: this.userId ? this.userId.toString() : null,
    type: this.type || "contact",
    name: this.name,
    email: this.email,
    phone: this.phone || undefined,
    subject: this.subject,
    message: this.message,
    status: this.status,
    response: this.response,
    publicTrackingToken: this.publicTrackingToken || null,
    resetLinkGeneratedAt: this.resetLinkGeneratedAt || null,
    hasResetLink: !!this.resetLinkGeneratedAt,
    repliedAt: this.repliedAt || null,
    repliedBy: this.repliedBy ? this.repliedBy.toString() : null,
    emailSubject: this.emailSubject || null,
    emailMessage: this.emailMessage || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

module.exports = { SupportTicket, ALLOWED_STATUSES, ALLOWED_TYPES, PASSWORD_RESET_STATUSES };
