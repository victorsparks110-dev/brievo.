const formService = require("../services/formService");
const fileService = require("../services/fileService");

/**
 * Form controllers.
 *
 * Thin controllers that parse requests and delegate to the service layer.
 */

/** Create a new form (designer, auth required). */
async function createForm(req, res) {
  try {
    if (!req.body.title || typeof req.body.title !== "string" || !req.body.title.trim()) {
      return res.status(400).json({ success: false, message: "Form title is required." });
    }
    const form = await formService.createForm({
      designerId: req.userId,
      title: req.body.title,
      description: req.body.description || "",
      brandName: req.body.brandName || "",
      status: "draft",
      fields: req.body.fields || [],
    });
    return res.status(201).json({ success: true, form });
  } catch (err) {
    const status = err.status || 500;
    const message = status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Get all forms for the authenticated designer. */
async function getDesignerForms(req, res) {
  try {
    const forms = await formService.getFormsByDesigner(req.userId);
    return res.status(200).json({ success: true, forms });
  } catch (err) {
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
}

/** Get a form by ID (designer, auth required). */
async function getFormById(req, res) {
  try {
    const form = await formService.getFormById(req.params.formId, req.userId);
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found." });
    }
    return res.status(200).json({ success: true, form });
  } catch (err) {
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
}

/** Get a form by share token (public, no auth). */
async function getFormByShareToken(req, res) {
  try {
    const form = await formService.getFormByShareToken(req.params.token);
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found." });
    }
    return res.status(200).json({ success: true, form });
  } catch (err) {
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
}

/** Update a form (designer, auth required). */
async function updateForm(req, res) {
  try {
    if (req.body.brandName !== undefined) {
      if (typeof req.body.brandName !== "string") {
        return res.status(400).json({ success: false, message: "Brand Name must be a string." });
      }
      req.body.brandName = req.body.brandName.trim();
      if (req.body.brandName.length > 100) {
        return res.status(400).json({ success: false, message: "Brand Name must be 100 characters or fewer." });
      }
    }
    // Validate brand name when publishing
    if (req.body.status === "published") {
      const brandName = req.body.brandName !== undefined ? req.body.brandName : "";
      if (!brandName || !brandName.trim()) {
        return res.status(400).json({ success: false, message: "Please enter your brand name before publishing the form." });
      }
    }
    const form = await formService.updateForm(req.params.formId, req.userId, req.body);
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found." });
    }
    return res.status(200).json({ success: true, form });
  } catch (err) {
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
}

/** Delete a form (designer, auth required). */
async function deleteForm(req, res) {
  try {
    const deleted = await formService.deleteForm(req.params.formId, req.userId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Form not found." });
    }
    return res.status(200).json({ success: true, message: "Form deleted." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
}

/**
 * Submit a form response (public, no auth).
 *
 * Accepts either:
 *   - JSON body (no files): { formId, submittedByName, ... }
 *   - multipart/form-data (with files): text fields + files array + fileMetadata JSON
 */
async function submitFormResponse(req, res) {
  try {
    const isMultipart = req.is("multipart/form-data");

    let formId, submittedByName, submittedByEmail, answers, projectInformation, uploadedFiles, files, fileMetadata;

    if (isMultipart) {
      formId = req.body.formId;
      submittedByName = req.body.submittedByName;
      submittedByEmail = req.body.submittedByEmail;
      answers = req.body.answers ? tryParseJSON(req.body.answers) : {};
      projectInformation = req.body.projectInformation ? tryParseJSON(req.body.projectInformation) : {};
      uploadedFiles = req.body.uploadedFiles ? tryParseJSON(req.body.uploadedFiles) : [];
      files = req.files || [];
      fileMetadata = req.body.fileMetadata ? tryParseJSON(req.body.fileMetadata) : [];
    } else {
      formId = req.body.formId;
      submittedByName = req.body.submittedByName;
      submittedByEmail = req.body.submittedByEmail;
      answers = req.body.answers || {};
      projectInformation = req.body.projectInformation || {};
      uploadedFiles = req.body.uploadedFiles || [];
      files = [];
      fileMetadata = [];
    }

    if (!formId || typeof formId !== "string") {
      return res.status(400).json({ success: false, message: "Form ID is required." });
    }
    if (!submittedByName || typeof submittedByName !== "string") {
      return res.status(400).json({ success: false, message: "Submitter name is required." });
    }
    if (!submittedByEmail || typeof submittedByEmail !== "string") {
      return res.status(400).json({ success: false, message: "Submitter email is required." });
    }

    // Validate files server-side before streaming to GridFS
    if (files.length > 0) {
      const { validateFiles } = require("../services/fileValidationService");
      const validation = validateFiles(files);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
    }

    const response = await formService.submitFormResponse({
      formId,
      submittedByName,
      submittedByEmail,
      answers,
      projectInformation,
      uploadedFiles,
      files,
      fileMetadata,
    });

    return res.status(201).json({ success: true, response });
  } catch (err) {
    const status = err.status || 500;
    const message = status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/** Safely parse a JSON string, returning the original value on failure. */
function tryParseJSON(str) {
  if (typeof str !== "string") return str;
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

/** Get responses for a form (designer, auth required). */
async function getResponsesForForm(req, res) {
  try {
    const responses = await formService.getResponsesForForm(req.params.formId, req.userId);
    if (responses === null) {
      return res.status(404).json({ success: false, message: "Form not found." });
    }
    return res.status(200).json({ success: true, responses });
  } catch (err) {
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
}

/** Get all responses for the designer across all forms. */
async function getDesignerResponses(req, res) {
  try {
    const responses = await formService.getResponsesByDesigner(req.userId);
    return res.status(200).json({ success: true, responses });
  } catch (err) {
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
}

/** Get a single response by ID. */
async function getResponseById(req, res) {
  try {
    const response = await formService.getResponseById(req.params.responseId, req.userId);
    if (!response) {
      return res.status(404).json({ success: false, message: "Response not found." });
    }
    return res.status(200).json({ success: true, response });
  } catch (err) {
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
}

/** Update a response's status. */
async function updateResponseStatus(req, res) {
  try {
    const updates = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.workStatus) updates.workStatus = req.body.workStatus;

    const response = await formService.updateResponseStatus(req.params.responseId, updates, req.userId);
    if (!response) {
      return res.status(404).json({ success: false, message: "Response not found." });
    }
    return res.status(200).json({ success: true, response });
  } catch (err) {
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
}

/** Send a confirmation email from the designer to the client. */
async function sendConfirmationEmail(req, res) {
  try {
    if (!req.body.subject || typeof req.body.subject !== "string") {
      return res.status(400).json({ success: false, message: "Subject is required." });
    }
    if (!req.body.message || typeof req.body.message !== "string") {
      return res.status(400).json({ success: false, message: "Message is required." });
    }

    const response = await formService.sendDesignerConfirmation(
      req.params.responseId,
      req.body.subject.trim(),
      req.body.message.trim(),
      req.userId
    );
    if (!response) {
      return res.status(404).json({ success: false, message: "Response not found." });
    }
    return res.status(200).json({
      success: true,
      message: "Confirmation email sent successfully.",
      response,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = status === 500 ? "An unexpected error occurred." : err.message;
    return res.status(status).json({ success: false, message });
  }
}

/**
 * Sanitize a filename for use in Content-Disposition headers.
 * Removes characters that could inject HTTP header values.
 */
function sanitizeFileName(name) {
  if (!name || typeof name !== "string") return "download";
  // Strip anything that is not alphanumeric, hyphen, underscore, dot, or space
  return name.replace(/[^a-zA-Z0-9\-_. ]/g, "_").substring(0, 255) || "download";
}

/**
 * Download an uploaded file (designer, auth required).
 *
 * Ownership is verified through the chain:
 *   Designer → Form → Response → Uploaded File → GridFS
 */
async function downloadFile(req, res) {
  try {
    const { fileId } = req.params;

    // Validate fileId format (must be a valid MongoDB ObjectId)
    if (!fileId || typeof fileId !== "string") {
      return res.status(400).json({ success: false, message: "Invalid file ID." });
    }

    const result = await fileService.downloadFile(fileId, req.userId);
    if (!result) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    const { stream, metadata } = result;

    // Set response headers
    res.setHeader("Content-Type", metadata.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizeFileName(metadata.fileName)}"; filename*=UTF-8''${encodeURIComponent(metadata.fileName)}`
    );
    if (metadata.size) {
      res.setHeader("Content-Length", metadata.size);
    }

    // Pipe the GridFS download stream to the response
    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "File download failed." });
      }
    });

    stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      const status = err.status || 500;
      const message = status === 500 ? "An unexpected error occurred." : err.message;
      return res.status(status).json({ success: false, message });
    }
  }
}

module.exports = {
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
};
