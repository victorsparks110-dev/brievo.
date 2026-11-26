const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const {
  createForm,
  getDesignerForms,
  getFormById,
  getFormByShareToken,
  updateForm,
  deleteForm,
  submitFormResponse,
  getResponsesForForm,
  getDesignerResponses,
  getResponseById,
  updateResponseStatus,
  sendConfirmationEmail,
  downloadFile,
} = require("../controllers/formController");
const { authenticate } = require("../middleware/authenticate");

/**
 * Form routes.
 *
 * Mounted at /api/forms in server.js.
 *
 * Public (no auth):
 *   GET  /api/forms/public/:token  -> load form by share token
 *   POST /api/forms/responses      -> submit a form response
 *
 * Designer (auth required):
 *   POST   /api/forms                     -> create a form
 *   GET    /api/forms/designer            -> list designer's forms
 *   GET    /api/forms/designer/responses  -> get all responses for designer
 *   GET    /api/forms/files/:fileId       -> download an uploaded file
 *   GET    /api/forms/:formId             -> get a form by ID
 *   PATCH  /api/forms/:formId             -> update a form
 *   DELETE /api/forms/:formId             -> delete a form
 *   GET    /api/forms/:formId/responses   -> get responses for a form
 *   PATCH  /api/forms/responses/:responseId -> update response status
 *   POST   /api/forms/responses/:responseId/confirm -> send confirmation
 *   GET    /api/forms/responses/:responseId -> get a single response
 */
const router = express.Router();

// Multer config for multipart form submissions with file uploads.
// Uses memory storage — files land in buffers, then stream to GridFS.
// Limits: 25 MB per file, 20 files per submission.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 20,
  },
});

/**
 * Wraps a multer middleware call and converts MulterErrors into
 * structured JSON responses instead of raw HTML 500 pages.
 */
function handleMulterUpload(req, res, next) {
  upload.array("files", 20)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: "File exceeds the 25 MB limit.",
        });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "Maximum 20 files allowed.",
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: "Unexpected file field.",
        });
      }
      return res.status(400).json({
        success: false,
        message: "File upload error.",
      });
    }
    next(err);
  });
}

// Rate limiter for public form submissions — prevents flooding.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many submission attempts. Please try again later." },
});

// Public routes
router.get("/public/:token", getFormByShareToken);
router.post("/responses", submitLimiter, handleMulterUpload, submitFormResponse);

// Designer routes (auth required)
router.get("/designer", authenticate, getDesignerForms);
router.get("/designer/responses", authenticate, getDesignerResponses);
router.get("/files/:fileId", authenticate, downloadFile);
router.post("/", authenticate, createForm);
router.get("/:formId", authenticate, getFormById);
router.patch("/:formId", authenticate, updateForm);
router.delete("/:formId", authenticate, deleteForm);
router.get("/:formId/responses", authenticate, getResponsesForForm);
router.patch("/responses/:responseId", authenticate, updateResponseStatus);
router.post("/responses/:responseId/confirm", authenticate, sendConfirmationEmail);
router.get("/responses/:responseId", authenticate, getResponseById);

module.exports = router;
