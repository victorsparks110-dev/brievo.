const authService = require("../services/authService");
const { sendPasswordResetEmail, sendPasswordResetAdminNotification, sendNewTicketNotification } = require("../services/emailService");
const { SupportTicket } = require("../models/supportTicketModel");

/**
 * Authentication controllers.
 *
 * Controllers are thin: parse the request, delegate to the service layer, and
 * translate outcomes into HTTP JSON responses. They never touch passwords,
 * hashes, tokens, or storage directly.
 *
 * Endpoints:
 *   POST /api/auth/signup  -> register a new designer
 *   POST /api/auth/login   -> authenticate and return a JWT
 */

/** Validate required signup fields; returns an error message or null. */
function validateSignupBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required.";
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return "Name is required.";
  }
  if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
    return "Email is required.";
  }
  if (!body.password || typeof body.password !== "string") {
    return "Password is required.";
  }
  return null;
}

/** Validate required login fields; returns an error message or null. */
function validateLoginBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required.";
  }
  if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
    return "Email is required.";
  }
  if (!body.password || typeof body.password !== "string") {
    return "Password is required.";
  }
  return null;
}

/** Register a new user (designer by default). */
async function signup(req, res) {
  const bodyError = validateSignupBody(req.body);
  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    const { user, trackingToken } = await authService.registerUser({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    });
    return res.status(201).json({
      success: true,
      message: "Account created. Your account is pending admin approval. You will receive a notification once approved.",
      user,
      trackingToken,
    });
  } catch (err) {
    return mapError(res, err);
  }
}

/** Authenticate a user and return a JWT. */
async function login(req, res) {
  const bodyError = validateLoginBody(req.body);
  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    const { user, token } = await authService.loginWithCredentials({
      email: req.body.email,
      password: req.body.password,
    });
    return res.status(200).json({ success: true, data: { user, token } });
  } catch (err) {
    return mapError(res, err);
  }
}

/** Return the currently authenticated user (from a valid JWT). */
async function me(req, res) {
  try {
    const user = await authService.getUserById(req.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account no longer exists.",
      });
    }
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return mapError(res, err);
  }
}

/** Update the authenticated user's profile (name, phone). */
async function updateMe(req, res) {
  try {
    const user = await authService.updateUserProfile(req.userId, req.body);
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return mapError(res, err);
  }
}

/**
 * Request a password reset. Generates a secure token, stores its hash on a
 * support ticket, and sends the reset email.
 * Never reveals whether the email exists.
 */
async function forgotPassword(req, res) {
  const bodyError = validateEmailBody(req.body);
  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    const result = await authService.requestPasswordReset(req.body.email);

    if (result.found) {
      // Generate a secure password-reset token
      const { token, tokenHash, expires } = authService.generateResetToken();

      // Create a password-reset support ticket with the token hash
      const ticket = await SupportTicket.create({
        userId: result.userId,
        type: "password_reset",
        name: result.name,
        email: result.email,
        subject: "Password Reset Request",
        message: `User requested a password reset.`,
        status: "new",
        resetTokenHash: tokenHash,
        resetTokenExpires: expires,
      });

      // Send the reset email
      const appUrl = process.env.APP_URL || "http://localhost:5173";
      const resetUrl = `${appUrl}/reset-password/${token}`;

      try {
        await sendPasswordResetEmail(result.email, resetUrl);
      } catch (err) {
        console.error(`Password reset email failed for ${result.email}:`, err.message);
      }

      // Notify the support team (fire-and-forget)
      sendNewTicketNotification(ticket).catch((err) => {
        console.error(`Password reset notification email failed for ${result.email}:`, err.message);
      });

      // Notify BRIEVO Support about the password reset request (fire-and-forget)
      sendPasswordResetAdminNotification({
        name: result.name,
        email: result.email,
        date: new Date().toISOString(),
      }).catch((err) => {
        console.error(`Password reset admin notification failed for ${result.email}:`, err.message);
      });
    }

    // Always return the same message — never reveal whether the email exists.
    return res.status(200).json({
      success: true,
      message:
        "If an account exists with that email, a password reset link has been sent. Please check your inbox.",
    });
  } catch (err) {
    return mapError(res, err);
  }
}

/** Reset the password using a token issued by forgot-password. */
async function resetPassword(req, res) {
  const bodyError = validateResetBody(req.body);
  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    await authService.resetPasswordWithToken({
      token: req.body.token,
      newPassword: req.body.newPassword,
    });
    return res.status(200).json({
      success: true,
      message: "Your password has been reset. You can now log in.",
    });
  } catch (err) {
    return mapError(res, err);
  }
}

/** Validate the forgot-password email body; returns an error message or null. */
function validateEmailBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required.";
  }
  if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
    return "Email is required.";
  }
  return null;
}

/** Validate the reset-password body; returns an error message or null. */
function validateResetBody(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required.";
  }
  if (!body.token || typeof body.token !== "string" || !body.token.trim()) {
    return "Reset token is required.";
  }
  if (
    !body.newPassword ||
    typeof body.newPassword !== "string" ||
    !body.newPassword
  ) {
    return "New password is required.";
  }
  return null;
}

/** Detect a MongoDB duplicate-key error (email already exists). */
function isDuplicateKeyError(err) {
  return err && (err.code === 11000 || err.code === 11001);
}

/** Map service/domain errors to clean HTTP JSON responses. */
function mapError(res, err) {
  // Duplicate email (reached via a unique-index backstop).
  if (isDuplicateKeyError(err)) {
    return res.status(409).json({
      success: false,
      message: "An account with that email already exists.",
    });
  }

  const status = err.status || 500;
  const message =
    status === 500 ? "An unexpected error occurred." : err.message;
  return res.status(status).json({ success: false, message });
}

module.exports = { signup, login, me, updateMe, forgotPassword, resetPassword };