const express = require("express");
const { createTicket, getMyTickets, getMyTicketById, getPublicTicketStatus } = require("../controllers/supportController");
const { authenticate, optionalAuth } = require("../middleware/authenticate");

/**
 * Support ticket routes.
 *
 * Mounted at /api/support in server.js, producing:
 *   POST /api/support                    -> create a support ticket (auth optional)
 *   GET  /api/support/my-tickets         -> retrieve the caller's tickets (auth required)
 *   GET  /api/support/my-tickets/:id     -> retrieve a single ticket by the caller (auth required)
 *   GET  /api/support/public-status/:trackingToken  -> retrieve ticket status (public, no auth required)
 */
const router = express.Router();

router.post("/", optionalAuth, createTicket);
router.get("/my-tickets", authenticate, getMyTickets);
router.get("/my-tickets/:id", authenticate, getMyTicketById);
router.get("/public-status/:trackingToken", getPublicTicketStatus);

module.exports = router;
