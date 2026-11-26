const { User } = require("../models/userModel");
const supportService = require("../services/supportService");
const { sendSupportReplyEmail } = require("../services/emailService");

/**
 * Admin/Support ticket controllers.
 *
 * Thin controllers for admin support ticket management. Only accessible
 * to users with the "support" or "admin" role.
 *
 * Endpoints:
 *   GET  /api/support/admin/tickets         -> list all tickets (optional status filter)
 *   GET  /api/support/admin/tickets/:id     -> get a single ticket
 *   POST /api/support/admin/tickets/:id/reply -> reply to a ticket
 *   PATCH /api/support/admin/tickets/:id/status -> update ticket status
 */

const ALLOWED_STATUSES = ["new", "in_progress", "answered", "resolved"];

/** Validate the reply body; returns an error message or null. */
function validateReplyBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required.";
  }
  if (!body.response || typeof body.response !== "string" || !body.response.trim()) {
    return "Response is required.";
  }
  return null;
}

/** Validate the status body; returns an error message or null. */
function validateStatusBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required.";
  }
  if (!body.status || typeof body.status !== "string" || !body.status.trim()) {
    return "Status is required.";
  }
  if (!ALLOWED_STATUSES.includes(body.status.trim())) {
    return `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`;
  }
  return null;
}

/** List all support tickets, optionally filtered by status. */
async function listTickets(req, res) {
  try {
    const status = req.query.status || undefined;
    const tickets = await supportService.getAllTickets({ status });
    return res.status(200).json({ success: true, tickets });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Get a single support ticket by ID. */
async function getTicket(req, res) {
  try {
    const ticket = await supportService.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }
    return res.status(200).json({ success: true, ticket });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Reply to a support ticket. */
async function reply(req, res) {
  const bodyError = validateReplyBody(req.body);
  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    const ticket = await supportService.replyToTicket(
      req.params.id,
      req.body.response
    );

    // Attempt to send email notification; report result accurately.
    let emailSent = false;
    try {
      await sendSupportReplyEmail(ticket.email, ticket.subject);
      emailSent = true;
    } catch (err) {
      console.error(`Email notification failed for ticket ${ticket.id}:`, err.message);
    }

    const message = emailSent
      ? "Response sent successfully. Email notification delivered."
      : "Response saved, but the email notification could not be sent.";

    return res.status(200).json({
      success: true,
      message,
      ticket,
      emailSent,
    });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Update a support ticket's status. */
async function updateStatus(req, res) {
  const bodyError = validateStatusBody(req.body);
  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    const ticket = await supportService.updateTicketStatus(
      req.params.id,
      req.body.status.trim()
    );
    return res.status(200).json({
      success: true,
      message: "Ticket status updated.",
      ticket,
    });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** List all pending designers awaiting approval. */
async function listPendingDesigners(req, res) {
  try {
    const designers = await User.find({ status: "pending" })
      .select("name email role status createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const mapped = designers.map((d) => ({
      id: d._id ? d._id.toString() : undefined,
      name: d.name,
      email: d.email,
      role: d.role,
      status: d.status,
      createdAt: d.createdAt,
    }));
    return res.status(200).json({ success: true, designers: mapped });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Approve a pending designer account. */
async function approveDesigner(req, res) {
  try {
    const designer = await User.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { status: "approved", emailVerified: true },
      { new: true }
    );
    if (!designer) {
      return res.status(404).json({
        success: false,
        message: "Designer not found or already approved.",
      });
    }

    // Also update the associated account-verification ticket so the
    // public tracking page reflects the approval.
    try {
      await supportService.updateTicketStatusForUser(designer._id, "answered", "Your account has been approved. You can now log in and start using Brievo.");
    } catch (ticketErr) {
      console.error("Failed to update tracking ticket after approval:", ticketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Account approved successfully.",
      designer: {
        id: designer._id,
        name: designer.name,
        email: designer.email,
        role: designer.role,
        status: designer.status,
      },
    });
  } catch (err) {
    console.error("approveDesigner error:", err);
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** List all password-reset support requests. */
async function listPasswordResetRequests(req, res) {
  try {
    const status = req.query.status || undefined;
    const tickets = await supportService.getPasswordResetRequests({ status });
    return res.status(200).json({ success: true, tickets });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Get a single password-reset support request by ID. */
async function getPasswordResetRequest(req, res) {
  try {
    const { SupportTicket } = require("../models/supportTicketModel");
    const ticket = await SupportTicket.findById(req.params.id)
      .select("+resetTokenHash +resetTokenExpires")
      .lean();
    if (!ticket || ticket.type !== "password_reset") {
      return res.status(404).json({
        success: false,
        message: "Password reset request not found.",
      });
    }
    // Map _id to id, strip sensitive fields
    const mapped = {
      ...ticket,
      id: ticket._id ? ticket._id.toString() : undefined,
      userId: ticket.userId ? ticket.userId.toString() : null,
      hasResetLink: !!ticket.resetLinkGeneratedAt,
      _id: undefined,
      __v: undefined,
      resetTokenHash: undefined,
      resetTokenExpires: undefined,
    };
    return res.status(200).json({ success: true, ticket: mapped });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Generate a password-reset link for a ticket. */
async function generateResetLink(req, res) {
  try {
    const result = await supportService.generateResetLink(req.params.id, req.userId);
    return res.status(200).json({
      success: true,
      message: "Reset link generated.",
      ticket: result.ticket,
      resetUrl: result.resetUrl,
    });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Send a password-reset email from the support dashboard. */
async function sendPasswordResetEmailReply(req, res) {
  if (!req.body.message || typeof req.body.message !== "string" || !req.body.message.trim()) {
    return res.status(400).json({ success: false, message: "Message is required." });
  }

  try {
    const ticket = await supportService.sendPasswordResetEmail(
      req.params.id,
      req.userId,
      req.body.message.trim(),
      req.body.subject || "Password Reset Request"
    );
    return res.status(200).json({
      success: true,
      message: "Email sent successfully.",
      ticket,
    });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

module.exports = {
  listTickets, getTicket, reply, updateStatus,
  listPendingDesigners, approveDesigner,
  listPasswordResetRequests, getPasswordResetRequest,
  generateResetLink, sendPasswordResetEmailReply,
};
