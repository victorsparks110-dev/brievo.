const supportService = require("../services/supportService");
const { sendNewTicketNotification } = require("../services/emailService");

/**
 * Support ticket controllers.
 *
 * Thin controllers: parse the request, delegate to the service layer, and
 * translate outcomes into HTTP JSON responses. Never touch the database directly.
 *
 * Endpoints:
 *   POST /api/support          -> create a support ticket (auth optional)
 *   GET  /api/support/my-tickets -> retrieve the caller's tickets (auth required)
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate the create-ticket body; returns an error message or null. */
function validateCreateBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required.";
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return "Name is required.";
  }
  if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
    return "Email is required.";
  }
  if (!EMAIL_REGEX.test(body.email.trim())) {
    return "Enter a valid email address.";
  }
  if (!body.subject || typeof body.subject !== "string" || !body.subject.trim()) {
    return "Subject is required.";
  }
  if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
    return "Message is required.";
  }
  return null;
}

/** Create a new support ticket. */
async function createTicket(req, res) {
  const bodyError = validateCreateBody(req.body);
  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    const ticket = await supportService.createTicket({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone || null,
      subject: req.body.subject,
      message: req.body.message,
      userId: req.userId || null,
    });

    // Send notification to the support team. Failure must not undo the ticket.
    try {
      await sendNewTicketNotification(ticket);
    } catch (emailErr) {
      console.error(`Support notification email failed for ticket ${ticket.id}:`, emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Support request sent successfully.",
      ticket,
    });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Retrieve all support tickets belonging to the authenticated user. */
async function getMyTickets(req, res) {
  try {
    const tickets = await supportService.getTicketsByUser(req.userId);
    return res.status(200).json({ success: true, tickets });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Retrieve a single support ticket belonging to the authenticated user. */
async function getMyTicketById(req, res) {
  try {
    const ticket = await supportService.getTicketByUser(req.params.id, req.userId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }
    return res.status(200).json({ success: true, ticket });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Retrieve a single support ticket belonging to the authenticated user. */
async function getMyTicketById(req, res) {
  try {
    const ticket = await supportService.getTicketByUser(req.params.id, req.userId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }
    return res.status(200).json({ success: true, ticket });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Retrieve ticket status by public tracking token (no auth required). */
async function getPublicTicketStatus(req, res) {
  try {
    const ticket = await supportService.getTicketByTrackingToken(req.params.trackingToken);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }
    const statusMap = { new: "pending", in_progress: "pending", answered: "approved", resolved: "approved" };
    return res.status(200).json({ success: true, status: statusMap[ticket.status] || ticket.status, ticketId: ticket.id });
  } catch (err) {
    const status = err.status || 500;
    const message =
      status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

module.exports = { createTicket, getMyTickets, getMyTicketById, getPublicTicketStatus };
