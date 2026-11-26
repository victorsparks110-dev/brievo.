const path = require("path");
const dotenv = require("dotenv");

// Load environment variables before any other module can read them.
dotenv.config({ path: path.resolve(__dirname, ".env") });

/**
 * Production startup validation.
 *
 * Fails fast with a clear message if required environment variables are
 * missing or insecure. Never logs or exposes secret values.
 */
function validateEnvironment() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";

  // --- JWT_SECRET ---
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("FATAL: JWT_SECRET is not set. A random secret cannot be used in production.");
    process.exit(1);
  }
  if (isProduction && jwtSecret.length < 32) {
    console.error("FATAL: JWT_SECRET must be at least 32 characters in production.");
    process.exit(1);
  }
  // Reject obvious development defaults in production.
  const insecureDefaults = ["sparks22", "secret", "changeme", "jwt_secret"];
  if (isProduction && insecureDefaults.includes(jwtSecret)) {
    console.error("FATAL: JWT_SECRET is an insecure default. Generate a cryptographically random secret.");
    process.exit(1);
  }

  // --- APP_URL (required for email links) ---
  if (!process.env.APP_URL) {
    console.warn("WARNING: APP_URL is not set. Email links will fall back to http://localhost:5173.");
  }

  // --- MONGODB_URI ---
  if (!process.env.MONGODB_URI) {
    console.error("FATAL: MONGODB_URI is not set.");
    process.exit(1);
  }

  // --- RESEND_API_KEY ---
  if (!process.env.RESEND_API_KEY) {
    console.warn("WARNING: RESEND_API_KEY is not set. Emails will not be sent.");
  }

  // --- EMAIL_VERIFICATION_DEV_MODE ---
  // The dev verification bypass (code "000000") must never be active in production.
  if (isProduction && process.env.EMAIL_VERIFICATION_DEV_MODE === "true") {
    console.error(
      "FATAL: EMAIL_VERIFICATION_DEV_MODE=true is not allowed in production. " +
      "Set EMAIL_VERIFICATION_DEV_MODE=false or remove it from the environment."
    );
    process.exit(1);
  }
}

validateEnvironment();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/routes/authRoutes");
const supportRoutes = require("./src/routes/supportRoutes");
const supportAdminRoutes = require("./src/routes/supportAdminRoutes");
const formRoutes = require("./src/routes/formRoutes");
const { connectDatabase, safeMessage } = require("./src/config/database");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
// CORS: allow configured frontend origin in production, unrestricted in development.
const frontendOrigin = process.env.APP_URL;
const corsOptions = frontendOrigin
  ? { origin: frontendOrigin, credentials: true }
  : {};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Test route
app.get("/", (req, res) => {
    res.send("Brievo backend is running!");
});

// API test route
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "BRIEVO frontend connected to backend successfully!"
    });
});

// Authentication routes
//   POST /api/auth/signup
//   POST /api/auth/login
app.use("/api/auth", authRoutes);

// Support ticket routes
//   POST /api/support
//   GET  /api/support/my-tickets
app.use("/api/support", supportRoutes);

// Admin support ticket routes (support role required)
//   GET   /api/support/admin/tickets
//   GET   /api/support/admin/tickets/:id
//   POST  /api/support/admin/tickets/:id/reply
//   PATCH /api/support/admin/tickets/:id/status
app.use("/api/support/admin", supportAdminRoutes);

// Form routes
//   POST   /api/forms                     -> create a form
//   GET    /api/forms/designer            -> list designer's forms
//   GET    /api/forms/designer/responses  -> all responses for designer
//   GET    /api/forms/public/:token       -> load form by share token
//   POST   /api/forms/responses           -> submit a form response
app.use("/api/forms", formRoutes);

// Establish the database connection before accepting requests. On failure,
// show only a sanitized message that never exposes the connection URI or
// password, then stop.
async function start() {
    try {
        await connectDatabase();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error(`Failed to start server: ${safeMessage(err)}`);
        process.exit(1);
    }
}

start();
