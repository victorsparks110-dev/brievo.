const express = require("express");
const {
  listTickets,
  getTicket,
  reply,
  updateStatus,
  listPendingDesigners,
  approveDesigner,
  listPasswordResetRequests,
  getPasswordResetRequest,
  generateResetLink,
  sendPasswordResetEmailReply,
} = require("../controllers/supportAdminController");
const { authenticate } = require("../middleware/authenticate");
const { authorize } = require("../middleware/authorize");

/**
 * Support admin routes.
 *
 * All routes require authentication and the "support" role.
 *
 * Existing:
 *   GET   /api/support/admin/tickets                     -> list all tickets
 *   GET   /api/support/admin/tickets/:id                 -> get a ticket
 *   POST  /api/support/admin/tickets/:id/reply           -> reply to a ticket
 *   PATCH /api/support/admin/tickets/:id/status          -> update status
 *   GET   /api/support/admin/pending-designers           -> list pending designers
 *   POST  /api/support/admin/pending-designers/:id       -> approve a designer
 *
 * Password reset:
 *   GET   /api/support/admin/password-reset-requests              -> list password reset requests
 *   GET   /api/support/admin/password-reset-requests/:id          -> get a password reset request
 *   POST  /api/support/admin/password-reset-requests/:id/generate-link -> generate reset link
 *   POST  /api/support/admin/password-reset-requests/:id/reply    -> send reset email
 */
const router = express.Router();

// All routes require authentication + support role
router.use(authenticate, authorize("support"));

// Existing ticket routes
router.get("/tickets", listTickets);
router.get("/tickets/:id", getTicket);
router.post("/tickets/:id/reply", reply);
router.patch("/tickets/:id/status", updateStatus);

// Pending designers
router.get("/pending-designers", listPendingDesigners);
router.post("/pending-designers/:id", approveDesigner);

// Password reset requests
router.get("/password-reset-requests", listPasswordResetRequests);
router.get("/password-reset-requests/:id", getPasswordResetRequest);
router.post("/password-reset-requests/:id/generate-link", generateResetLink);
router.post("/password-reset-requests/:id/reply", sendPasswordResetEmailReply);

module.exports = router;
