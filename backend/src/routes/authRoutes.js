const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  signup,
  login,
  me,
  updateMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authenticate");

/**
 * Authentication routes.
 *
 * Mounted at /api/auth in server.js, producing:
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   GET  /api/auth/me          (requires a valid bearer token)
 *   PATCH /api/auth/me         (requires a valid bearer token)
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 */
const router = express.Router();

// Rate limiters — reasonable limits for a small application.
// Uses the default in-memory store. For production with multiple instances,
// swap to a Redis-backed store.

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again later." },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many signup attempts. Please try again later." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many password reset requests. Please try again later." },
});

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.get("/me", authenticate, me);
router.patch("/me", authenticate, updateMe);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;