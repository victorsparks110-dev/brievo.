const crypto = require("crypto");
const { Readable } = require("stream");
const { FormDefinition } = require("../models/formDefinitionModel");
const { FormResponse } = require("../models/formResponseModel");
const { User } = require("../models/userModel");
const { sendProjectSubmissionNotification, sendDesignerConfirmationEmail } = require("./emailService");
const gridFs = require("./gridFsService");

/**
 * Form service.
 *
 * Handles all database operations for form definitions and responses.
 */

function generateShareToken() {
  return crypto.randomBytes(24).toString("base64url");
}

/** Create a new form definition. Drafts do NOT receive a shareToken. */
async function createForm({ designerId, title, description, brandName, status, fields }) {
  const form = await FormDefinition.create({
    designerId,
    title: title.trim(),
    description: description ? description.trim() : "",
    brandName: brandName ? brandName.trim() : "",
    status: status || "draft",
    fields: fields || [],
  });
  return form.toJSON();
}

/** Get all forms for a designer. */
async function getFormsByDesigner(designerId) {
  const forms = await FormDefinition.find({ designerId })
    .sort({ createdAt: -1 })
    .lean();
  return forms.map((f) => ({
    ...f,
    id: f._id ? f._id.toString() : undefined,
    designerId: f.designerId ? f.designerId.toString() : undefined,
    _id: undefined,
    __v: undefined,
  }));
}

/** Get a form by ID, scoped to a designer. */
async function getFormById(formId, designerId) {
  const form = await FormDefinition.findOne({ _id: formId, designerId }).lean();
  if (!form) return null;
  return {
    ...form,
    id: form._id ? form._id.toString() : undefined,
    designerId: form.designerId ? form.designerId.toString() : undefined,
    _id: undefined,
    __v: undefined,
  };
}

/** Get a form by share token (public, no auth). Only returns published forms. */
async function getFormByShareToken(token) {
  const form = await FormDefinition.findOne({ shareToken: token, status: "published" }).lean();
  if (!form) return null;
  return {
    id: form._id ? form._id.toString() : undefined,
    designerId: form.designerId ? form.designerId.toString() : undefined,
    title: form.publishedTitle || form.title,
    description: form.publishedDescription || form.description,
    brandName: form.publishedBrandName || form.brandName || "",
    status: form.status,
    shareToken: form.shareToken,
    fields: form.publishedFields && form.publishedFields.length > 0 ? form.publishedFields : form.fields,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
}

/** Update a form. */
async function updateForm(formId, designerId, updates) {
  // When publishing, snapshot the current draft into published* fields
  if (updates.status === "published") {
    if (updates.title !== undefined) updates.publishedTitle = updates.title;
    if (updates.description !== undefined) updates.publishedDescription = updates.description;
    if (updates.brandName !== undefined) updates.publishedBrandName = updates.brandName;
    if (updates.fields !== undefined) updates.publishedFields = updates.fields;

    // On first publish, generate a secure shareToken if one does not already exist.
    // Existing published forms keep their original token (backward compatible).
    if (!updates.shareToken) {
      const existing = await FormDefinition.findById(formId).select("shareToken").lean();
      if (!existing || !existing.shareToken) {
        updates.shareToken = generateShareToken();
      }
    }
  }
  const form = await FormDefinition.findOneAndUpdate(
    { _id: formId, designerId },
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();
  if (!form) return null;
  return {
    ...form,
    id: form._id ? form._id.toString() : undefined,
    designerId: form.designerId ? form.designerId.toString() : undefined,
    _id: undefined,
    __v: undefined,
  };
}

/** Delete a form and its associated GridFS files. */
async function deleteForm(formId, designerId) {
  const form = await FormDefinition.findOneAndDelete({ _id: formId, designerId });
  if (!form) return false;

  // Collect all gridFsFileIds from responses before deleting them.
  const responses = await FormResponse.find({ formId }).lean();
  const gridFsIds = new Set();
  for (const r of responses) {
    if (Array.isArray(r.uploadedFiles)) {
      for (const f of r.uploadedFiles) {
        if (f.gridFsFileId) gridFsIds.add(String(f.gridFsFileId));
      }
    }
  }

  // Delete GridFS files (best-effort; missing files are silently skipped).
  for (const id of gridFsIds) {
    await gridFs.deleteFile(id).catch(() => {});
  }

  await FormResponse.deleteMany({ formId });
  return true;
}

/** Submit a form response (public, no auth required). Only for published forms.
 *
 *  When `files` and `fileMetadata` are provided (multipart submission),
 *  each file is streamed to GridFS and its gridFsFileId is recorded in
 *  the response's uploadedFiles array. On any failure, all previously
 *  uploaded GridFS files are cleaned up.
 */
async function submitFormResponse({
  formId,
  submittedByName,
  submittedByEmail,
  answers,
  projectInformation,
  uploadedFiles,
  files,
  fileMetadata,
}) {
  const form = await FormDefinition.findById(formId).lean();
  if (!form) {
    const err = new Error("Form not found.");
    err.status = 404;
    throw err;
  }
  if (form.status !== "published") {
    const err = new Error("This form has not been published yet.");
    err.status = 403;
    throw err;
  }

  const designerId = form.designerId ? form.designerId.toString() : null;

  // If there are actual file uploads, stream them to GridFS
  let enrichedFiles = uploadedFiles || [];
  const uploadedGridFsIds = [];

  if (files && files.length > 0 && designerId) {
    enrichedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const multerFile = files[i];
      const meta = fileMetadata && fileMetadata[i] ? fileMetadata[i] : {};

      const fieldId = meta.fieldId || multerFile.fieldname || "unknown";
      const category = meta.category || "project";
      const fileName = multerFile.originalname || "unnamed";
      const mimeType = multerFile.mimetype || "application/octet-stream";
      const size = multerFile.size || 0;

      try {
        const fileStream = Readable.from(multerFile.buffer);
        const gridFsFileId = await gridFs.uploadFile(fileStream, fileName, {
          mimeType,
          size,
          formId,
          designerId,
          fieldId,
          category,
        });

        uploadedGridFsIds.push(gridFsFileId);

        enrichedFiles.push({
          gridFsFileId,
          fieldId,
          category,
          fileName,
          fileType: meta.fileType || mimeType,
          mimeType,
          size,
          url: "",
        });
      } catch (uploadErr) {
        // Cleanup: delete any files already uploaded for this submission
        for (const uploadedId of uploadedGridFsIds) {
          await gridFs.deleteFile(uploadedId).catch(() => {});
        }
        const err = new Error(`File upload failed for "${fileName}": ${uploadErr.message}`);
        err.status = 500;
        throw err;
      }
    }
  }

  const response = await FormResponse.create({
    formId,
    submittedByName: submittedByName.trim(),
    submittedByEmail: submittedByEmail.trim().toLowerCase(),
    answers: answers || {},
    projectInformation: projectInformation || {},
    uploadedFiles: enrichedFiles,
  });

  // Notify the designer about the new submission (fire-and-forget)
  if (designerId) {
    User.findById(form.designerId).then((designer) => {
      if (designer && designer.email) {
        sendProjectSubmissionNotification({
          designerEmail: designer.email,
          designerName: designer.name,
          clientName: submittedByName.trim(),
          clientEmail: submittedByEmail.trim().toLowerCase(),
          formTitle: form.title || "",
        }).catch((err) => {
          console.error(`Project submission notification failed for designer ${designer.email}:`, err.message);
        });
      }
    }).catch(() => {});
  }

  return response.toJSON();
}

/** Get all responses for a form, scoped to designer. */
async function getResponsesForForm(formId, designerId) {
  const form = await FormDefinition.findOne({ _id: formId, designerId }).lean();
  if (!form) return null;

  const responses = await FormResponse.find({ formId })
    .sort({ createdAt: -1 })
    .lean();
  return responses.map((r) => ({
    ...r,
    id: r._id ? r._id.toString() : undefined,
    formId: r.formId ? r.formId.toString() : undefined,
    _id: undefined,
    __v: undefined,
  }));
}

/** Get all responses for a designer across all their forms. */
async function getResponsesByDesigner(designerId) {
  const forms = await FormDefinition.find({ designerId }).lean();
  const formIds = forms.map((f) => f._id);
  if (formIds.length === 0) return [];

  const responses = await FormResponse.find({ formId: { $in: formIds } })
    .sort({ createdAt: -1 })
    .lean();

  const formMap = {};
  for (const f of forms) {
    formMap[f._id.toString()] = {
      id: f._id.toString(),
      designerId: f.designerId ? f.designerId.toString() : undefined,
      title: f.title,
      description: f.description,
      brandName: f.brandName || "",
      status: f.status,
      fields: f.fields,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    };
  }

  return responses.map((r) => ({
    ...r,
    id: r._id ? r._id.toString() : undefined,
    formId: r.formId ? r.formId.toString() : undefined,
    form: formMap[r.formId.toString()] || null,
    _id: undefined,
    __v: undefined,
  }));
}

/**
 * Verify that a form response belongs to the given designer.
 *
 * Returns the response object (with id/formId cleaned) if the designer owns
 * the form associated with the response, or null if not found / not owned.
 */
async function verifyResponseOwnership(responseId, designerId) {
  const response = await FormResponse.findById(responseId).lean();
  if (!response) return null;

  const form = await FormDefinition.findById(response.formId).lean();
  if (!form) return null;
  if (form.designerId.toString() !== designerId) return null;

  return {
    ...response,
    id: response._id ? response._id.toString() : undefined,
    formId: response.formId ? response.formId.toString() : undefined,
    _id: undefined,
    __v: undefined,
  };
}

/** Get a single response by ID (designer must own the response's form). */
async function getResponseById(responseId, designerId) {
  return verifyResponseOwnership(responseId, designerId);
}

/** Update a response's status or workStatus (designer must own the response's form). */
async function updateResponseStatus(responseId, updates, designerId) {
  const response = await verifyResponseOwnership(responseId, designerId);
  if (!response) return null;

  // When workStatus becomes "completed", record the completion timestamp.
  // Preserve the original timestamp if already completed (do not overwrite).
  if (updates.workStatus === "completed" && response.workStatus !== "completed") {
    updates.completedAt = new Date();
  }

  const updated = await FormResponse.findByIdAndUpdate(
    responseId,
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();
  if (!updated) return null;
  return {
    ...updated,
    id: updated._id ? updated._id.toString() : undefined,
    formId: updated.formId ? updated.formId.toString() : undefined,
    _id: undefined,
    __v: undefined,
  };
}

/**
 * Send a confirmation email from the designer to the client.
 * Also updates the response status to "confirmed".
 * Designer must own the form associated with the response.
 */
async function sendDesignerConfirmation(responseId, subject, message, designerId) {
  const response = await verifyResponseOwnership(responseId, designerId);
  if (!response) return null;

  const clientEmail = response.submittedByEmail;
  if (!clientEmail) {
    const err = new Error("Client email not found on this submission.");
    err.status = 400;
    throw err;
  }

  // Send the email through Brevo
  await sendDesignerConfirmationEmail({
    clientEmail,
    subject: subject || "Project Submission Confirmation",
    message,
  });

  // Update the response status
  const updated = await FormResponse.findByIdAndUpdate(
    responseId,
    {
      $set: {
        status: "confirmed",
        confirmationSentAt: new Date(),
        confirmationSubject: subject,
        confirmationBody: message,
      },
    },
    { new: true, runValidators: true }
  ).lean();

  return {
    ...updated,
    id: updated._id ? updated._id.toString() : undefined,
    formId: updated.formId ? updated.formId.toString() : undefined,
    _id: undefined,
    __v: undefined,
  };
}

module.exports = {
  createForm,
  getFormsByDesigner,
  getFormById,
  getFormByShareToken,
  updateForm,
  deleteForm,
  submitFormResponse,
  getResponsesForForm,
  getResponsesByDesigner,
  getResponseById,
  updateResponseStatus,
  sendDesignerConfirmation,
};
