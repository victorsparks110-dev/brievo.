/**
 * Authorization middleware.
 *
 * Must be used after the `authenticate` middleware, which sets `req.userRole`.
 * Checks whether the authenticated user's role is in the allowed list.
 * Responds 403 when the role is not authorized.
 *
 * Usage:
 *   router.get("/admin/tickets", authenticate, authorize("support", "admin"), handler);
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    const role = req.userRole;

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
}

module.exports = { authorize };
