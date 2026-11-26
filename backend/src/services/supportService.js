const crypto = require("crypto");
const { SupportTicket } = require("../models/supportTicketModel");

/**
 * Support ticket service.
 *
 * Handles all database operations for support tickets. The controller layer
 * calls these functions and translates outcomes into HTTP responses.
 */

/**
 * Create a new support ticket.
 *
 * @param {Object} params
 * @param {string} params.name     - Submitter's display name (required).
 * @param {string} params.email    - Submitter's email (required).
 * @param {string} params.subject  - Ticket subject (required).
 * @param {string} params.message  - Ticket body (required).
 * @param {string|null} [params.phone]  - Submitter's phone (optional).
 * @param {string|null} [params.userId] - Authenticated user's ID, if available.
 * @returns {Promise<Object>} The created ticket as a plain object.
 */
async function createTicket({ name, email, subject, message, phone = null, userId = null }) {
  const publicTrackingToken = crypto.randomBytes(24).toString("base64url");
  const ticket = await SupportTicket.create({
    userId: userId || null,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone || null,
    subject: subject.trim(),
    message: message.trim(),
    publicTrackingToken: publicTrackingToken,
  });
  return ticket.toJSON();
}

/**
 * Retrieve all support tickets belonging to a specific user.
 *
 * @param {string} userId - The authenticated user's ID.
 * @returns {Promise<Object[]>} Array of ticket plain objects, newest first.
 */
async function getTicketsByUser(userId) {
  const tickets = await SupportTicket.find({ userId })
    .sort({ createdAt: -1 })
    .lean();
  return tickets.map((t) => ({
    ...t,
    id: t._id ? t._id.toString() : undefined,
    userId: t.userId ? t.userId.toString() : null,
    _id: undefined,
    __v: undefined,
  }));
}

/**
 * Retrieve a single support ticket by ID, scoped to a specific user.
 * Returns null if the ticket does not belong to the user.
 *
 * @param {string} ticketId - The ticket's MongoDB _id.
 * @param {string} userId   - The authenticated user's ID.
 * @returns {Promise<Object|null>} Ticket plain object or null if not found/not owned.
 */
async function getTicketByUser(ticketId, userId) {
  const ticket = await SupportTicket.findOne({ _id: ticketId, userId }).lean();
  if (!ticket) return null;
  return {
    ...ticket,
    id: ticket._id ? ticket._id.toString() : undefined,
    userId: ticket.userId ? ticket.userId.toString() : null,
    _id: undefined,
    __v: undefined,
  };
}

/**
 * Retrieve a support ticket by its public tracking token (no auth required).
 *
 * @param {string} trackingToken - The public tracking token.
 * @returns {Promise<Object|null>} Ticket plain object or null if not found.
 */
async function getTicketByTrackingToken(trackingToken) {
  const ticket = await SupportTicket.findOne({ publicTrackingToken: trackingToken }).lean();
  if (!ticket) return null;
  return {
    ...ticket,
    id: ticket._id ? ticket._id.toString() : undefined,
    userId: ticket.userId ? ticket.userId.toString() : null,
    _id: undefined,
    __v: undefined,
  };
}

/**
 * Update the status of the most recent support ticket for a given user.
 * Used to sync the public tracking page when a designer is approved.
 *
 * @param {string} userId  - The designer's user ID.
 * @param {string} status  - New ticket status.
 * @returns {Promise<void>}
 */
async function updateTicketStatusForUser(userId, status, response = null) {
  const ticket = await SupportTicket.findOne({ userId }).sort({ createdAt: -1 });
  if (ticket) {
    ticket.status = status;
    if (response) ticket.response = response;
    await ticket.save();
  }
}

/**
 * Get all password-reset support tickets (admin/support use).
 *
 * @param {Object} [params]
 * @param {string} [params.status] - Filter by status (optional).
 * @returns {Promise<Object[]>} Array of ticket plain objects, newest first.
 */
async function getPasswordResetRequests({ status } = {}) {
  const filter = { type: "password_reset" };
  if (status) {
    filter.status = status;
  }
  const tickets = await SupportTicket.find(filter)
    .sort({ createdAt: -1 })
    .lean();
  return tickets.map((t) => ({
    ...t,
    id: t._id ? t._id.toString() : undefined,
    userId: t.userId ? t.userId.toString() : null,
    repliedBy: t.repliedBy ? t.repliedBy.toString() : null,
    hasResetLink: !!t.resetLinkGeneratedAt,
    _id: undefined,
    __v: undefined,
  }));
}

/**
 * Generate a password-reset link for a password-reset support ticket.
 * Returns the raw reset URL to the support agent (never stored or logged raw).
 *
 * @param {string} ticketId - The support ticket's MongoDB _id.
 * @param {string} supportUserId - The support agent's user ID.
 * @returns {Promise<{ ticket: Object, resetUrl: string }>}
 * @throws {Error} If ticket not found or not a password-reset ticket.
 */
async function generateResetLink(ticketId, supportUserId) {
  const crypto = require("crypto");
  const { hashResetToken, generateResetToken } = require("./authService");

  const ticket = await SupportTicket.findById(ticketId)
    .select("+resetTokenHash +resetTokenExpires");
  if (!ticket) {
    const err = new Error("Ticket not found.");
    err.status = 404;
    throw err;
  }
  if (ticket.type !== "password_reset") {
    const err = new Error("This is not a password reset request.");
    err.status = 400;
    throw err;
  }

  // Generate a new token (invalidates any previous one)
  const { token, tokenHash, expires } = generateResetToken();
  ticket.resetTokenHash = tokenHash;
  ticket.resetTokenExpires = expires;
  ticket.resetLinkGeneratedAt = new Date();
  ticket.status = "in_progress";
  await ticket.save();

  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const resetUrl = `${appUrl}/reset-password/${token}`;

  return {
    ticket: ticket.toJSON(),
    resetUrl,
  };
}

/**
 * Send a password-reset email from the support dashboard.
 *
 * @param {string} ticketId - The support ticket's MongoDB _id.
 * @param {string} supportUserId - The support agent's user ID.
 * @param {string} message - The email body (may contain the reset link).
 * @param {string} [subject] - Optional email subject override.
 * @returns {Promise<Object>} Updated ticket.
 * @throws {Error} If ticket not found or no reset link generated yet.
 */
async function sendPasswordResetEmail(ticketId, supportUserId, message, subject) {
  const ticket = await SupportTicket.findById(ticketId)
    .select("+resetTokenHash +resetTokenExpires");
  if (!ticket) {
    const err = new Error("Ticket not found.");
    err.status = 404;
    throw err;
  }
  if (ticket.type !== "password_reset") {
    const err = new Error("This is not a password reset request.");
    err.status = 400;
    throw err;
  }
  if (!ticket.resetLinkGeneratedAt) {
    const err = new Error("Please generate a reset link first.");
    err.status = 400;
    throw err;
  }

  // Reconstruct the reset URL from the token hash — but we need the raw token.
  // Since we only store the hash, the reset URL must be provided by the support
  // agent (they got it from generateResetLink). The message should contain it.
  // We'll send the email with the message as-is.
  const emailSubject = subject || "Password Reset Request";

  const { sendCustomPasswordResetEmail } = require("./emailService");
  await sendCustomPasswordResetEmail(ticket.email, emailSubject, message);

  ticket.status = "replied";
  ticket.repliedAt = new Date();
  ticket.repliedBy = supportUserId;
  ticket.emailSubject = emailSubject;
  ticket.emailMessage = message;
  ticket.response = message;
  await ticket.save();

  return ticket.toJSON();
}

module.exports = {
  createTicket,
  getTicketsByUser,
  getTicketByUser,
  getAllTickets,
  getTicketById,
  getTicketByTrackingToken,
  updateTicketStatusForUser,
  replyToTicket,
  updateTicketStatus,
  getPasswordResetRequests,
  generateResetLink,
  sendPasswordResetEmail,
};

/**
 * Retrieve all support tickets (admin/support use).
 *
 * @param {Object} [params]
 * @param {string} [params.status] - Filter by status (optional).
 * @returns {Promise<Object[]>} Array of ticket plain objects, newest first.
 */
async function getAllTickets({ status } = {}) {
  const filter = {};
  if (status) {
    filter.status = status;
  }
  const tickets = await SupportTicket.find(filter)
    .sort({ createdAt: -1 })
    .lean();
  return tickets.map((t) => ({
    ...t,
    id: t._id ? t._id.toString() : undefined,
    userId: t.userId ? t.userId.toString() : null,
    _id: undefined,
    __v: undefined,
  }));
}

/**
 * Retrieve a single support ticket by ID (admin/support use).
 *
 * @param {string} ticketId - The ticket's MongoDB _id.
 * @returns {Promise<Object|null>} Ticket plain object or null if not found.
 */
async function getTicketById(ticketId) {
  const ticket = await SupportTicket.findById(ticketId).lean();
  if (!ticket) return null;
  return {
    ...ticket,
    id: ticket._id ? ticket._id.toString() : undefined,
    userId: ticket.userId ? ticket.userId.toString() : null,
    _id: undefined,
    __v: undefined,
  };
}

/**
 * Reply to a support ticket (admin/support use).
 * Sets the response and updates status to "answered".
 *
 * @param {string} ticketId - The ticket's MongoDB _id.
 * @param {string} response - The support response text.
 * @returns {Promise<Object>} Updated ticket.
 * @throws {Error} If ticket not found.
 */
async function replyToTicket(ticketId, response) {
  const ticket = await SupportTicket.findByIdAndUpdate(
    ticketId,
    { response: response.trim(), status: "answered" },
    { new: true, runValidators: true }
  ).lean();
  if (!ticket) {
    const err = new Error("Support ticket not found.");
    err.status = 404;
    throw err;
  }
  return {
    ...ticket,
    id: ticket._id ? ticket._id.toString() : undefined,
    userId: ticket.userId ? ticket.userId.toString() : null,
    _id: undefined,
    __v: undefined,
  };
}

/**
 * Update a support ticket's status (admin/support use).
 *
 * @param {string} ticketId - The ticket's MongoDB _id.
 * @param {string} status   - New status value.
 * @returns {Promise<Object>} Updated ticket.
 * @throws {Error} If ticket not found.
 */
async function updateTicketStatus(ticketId, status) {
  const ticket = await SupportTicket.findByIdAndUpdate(
    ticketId,
    { status },
    { new: true, runValidators: true }
  ).lean();
  if (!ticket) {
    const err = new Error("Support ticket not found.");
    err.status = 404;
    throw err;
  }
  return {
    ...ticket,
    id: ticket._id ? ticket._id.toString() : undefined,
    userId: ticket.userId ? ticket.userId.toString() : null,
    _id: undefined,
    __v: undefined,
  };
}
