const { verifyToken } = require("../services/authService");

/**
 * Authentication middleware.
 *
 * Reads the bearer token from the Authorization header, verifies it, and
 * attaches the resolved user id to `req.userId` and role to `req.userRole`.
 * Responds 401 (without leaking sensitive details) when the token is missing
 * or invalid.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.userRole = payload.role || "designer";
    next();
  } catch (err) {
    return res
      .status(err.status || 401)
      .json({ success: false, message: "Invalid or expired token." });
  }
}

/**
 * Optional authentication middleware.
 *
 * Like `authenticate`, but never rejects the request. If a valid bearer
 * token is present, `req.userId` and `req.userRole` are populated. If the
 * token is missing or invalid, the request proceeds without user context —
 * suitable for endpoints that serve both authenticated and anonymous callers.
 */
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return next();

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.userRole = payload.role || "designer";
  } catch {
    // Token invalid — proceed without user context.
  }
  next();
}

module.exports = { authenticate, optionalAuth };
