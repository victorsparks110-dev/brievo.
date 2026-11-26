const mongoose = require("mongoose");

/**
 * Form response model.
 *
 * Stores client submissions for designer project intake forms.
 */

const RESPONSE_STATUSES = ["new", "reviewed", "confirmed"];
const WORK_STATUSES = ["new", "in_progress", "completed"];

const projectInformationSchema = new mongoose.Schema(
  {
    clientName: { type: String, default: "" },
    clientEmail: { type: String, default: "" },
    clientPhone: { type: String, default: "" },
    companyName: { type: String, default: "" },
    projectTypes: [{ type: String }],
    otherProjectType: { type: String, default: "" },
    description: { type: String, default: "" },
    projectGoal: { type: String, default: "" },
    otherProjectGoal: { type: String, default: "" },
    targetAudience: { type: String, default: "" },
    deadline: { type: String, default: "" },
    noSpecificDeadline: { type: Boolean, default: false },
    content: { type: String, default: "" },
    preferredColors: { type: String, default: "" },
    preferredColorHex: { type: String, default: "" },
    noColorPreference: { type: Boolean, default: false },
    projectUsage: [{ type: String }],
    otherProjectUsage: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "NGN" },
    referenceNotes: { type: String, default: "" },
    additionalNotes: { type: String, default: "" },
  },
  { _id: false }
);

const uploadedFormFileSchema = new mongoose.Schema(
  {
    gridFsFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    fieldId: { type: String, default: "" },
    category: { type: String, default: "" },
    fileName: { type: String, default: "" },
    fileType: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const formResponseSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormDefinition",
      required: true,
      index: true,
    },
    submittedByName: {
      type: String,
      required: [true, "Submitter name is required."],
      trim: true,
    },
    submittedByEmail: {
      type: String,
      required: [true, "Submitter email is required."],
      lowercase: true,
      trim: true,
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    projectInformation: {
      type: projectInformationSchema,
      default: () => ({}),
    },
    uploadedFiles: [uploadedFormFileSchema],
    status: {
      type: String,
      enum: RESPONSE_STATUSES,
      default: "new",
    },
    workStatus: {
      type: String,
      enum: WORK_STATUSES,
      default: "new",
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

formResponseSchema.methods.toJSON = function toJSON() {
  return {
    id: this._id ? this._id.toString() : undefined,
    formId: this.formId ? this.formId.toString() : undefined,
    submittedByName: this.submittedByName,
    submittedByEmail: this.submittedByEmail,
    answers: this.answers,
    projectInformation: this.projectInformation,
    uploadedFiles: this.uploadedFiles.map((f) => ({
      gridFsFileId: f.gridFsFileId ? f.gridFsFileId.toString() : null,
      fieldId: f.fieldId,
      category: f.category,
      fileName: f.fileName,
      fileType: f.fileType,
      mimeType: f.mimeType || "",
      size: f.size || 0,
      url: f.url,
    })),
    status: this.status,
    workStatus: this.workStatus,
    submittedAt: this.createdAt,
    reviewedAt: this.reviewedAt || null,
    confirmationSentAt: this.confirmationSentAt || null,
    confirmationSubject: this.confirmationSubject || undefined,
    confirmationBody: this.confirmationBody || undefined,
    completedAt: this.completedAt || null,
  };
};

const FormResponse = mongoose.model("FormResponse", formResponseSchema);

module.exports = { FormResponse, RESPONSE_STATUSES, WORK_STATUSES };
