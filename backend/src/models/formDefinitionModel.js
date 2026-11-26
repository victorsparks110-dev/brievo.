const mongoose = require("mongoose");

/**
 * Form definition model.
 *
 * Stores project intake forms created by designers. Each form has a unique
 * shareToken that clients use to access the public submission page.
 */

const FORM_STATUSES = ["draft", "published", "archived"];

const formFieldOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const formFieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: "" },
    options: [formFieldOptionSchema],
    customTypeLabel: { type: String, default: "" },
    currency: { type: String, default: "" },
    allowMultiple: { type: Boolean, default: false },
    accept: { type: String, default: "" },
    allowOther: { type: Boolean, default: false },
    otherPlaceholder: { type: String, default: "" },
    section: { type: String, default: "core" },
  },
  { _id: false }
);

const formDefinitionSchema = new mongoose.Schema(
  {
    designerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Form title is required."],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: FORM_STATUSES,
      default: "draft",
    },
    brandName: {
      type: String,
      default: "",
      trim: true,
    },
    shareToken: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
    fields: [formFieldSchema],
    publishedTitle: { type: String, default: "" },
    publishedDescription: { type: String, default: "" },
    publishedBrandName: { type: String, default: "" },
    publishedFields: [formFieldSchema],
  },
  {
    timestamps: true,
  }
);

formDefinitionSchema.methods.toJSON = function toJSON() {
  return {
    id: this._id ? this._id.toString() : undefined,
    designerId: this.designerId ? this.designerId.toString() : undefined,
    title: this.title,
    description: this.description,
    brandName: this.brandName || "",
    status: this.status,
    shareToken: this.shareToken,
    fields: this.fields,
    publishedTitle: this.publishedTitle || "",
    publishedDescription: this.publishedDescription || "",
    publishedBrandName: this.publishedBrandName || "",
    publishedFields: this.publishedFields || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const FormDefinition = mongoose.model("FormDefinition", formDefinitionSchema);

module.exports = { FormDefinition, FORM_STATUSES };
