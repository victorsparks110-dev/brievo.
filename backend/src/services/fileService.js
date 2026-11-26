const { FormDefinition } = require("../models/formDefinitionModel");
const gridFs = require("./gridFsService");

/**
 * File service.
 *
 * Handles ownership-protected file operations for BRIEVO uploads.
 * Sits above gridFsService — always verifies authorization before
 * any GridFS access.
 *
 * Authorization chain:
 *   GridFS file → metadata.formId → FormDefinition → designerId
 */

/**
 * Verify that a GridFS file belongs to the given designer.
 *
 * The chain is:
 *   1. Look up the GridFS file metadata (formId stored in metadata).
 *   2. Find the FormDefinition referenced by that formId.
 *   3. Verify the form's designerId matches the requesting designer.
 *
 * We do NOT use metadata.designerId directly as the authorization decision.
 * The authoritative check comes from the actual FormDefinition document.
 *
 * @param {string} fileId - The GridFS file ID.
 * @param {string} designerId - The authenticated designer's user ID.
 * @returns {Promise<object|null>} GridFS file metadata if owned, null if not.
 */
async function verifyFileOwnership(fileId, designerId) {
  // 1. Get GridFS file metadata
  const gridFile = await gridFs.getFileMetadata(fileId);
  if (!gridFile) return null;

  // 2. Extract formId from GridFS metadata
  const formId = gridFile.metadata && gridFile.metadata.formId;
  if (!formId) return null;

  // 3. Find the FormDefinition (authoritative ownership source)
  let form;
  try {
    form = await FormDefinition.findById(formId).lean();
  } catch {
    return null;
  }
  if (!form) return null;

  // 4. Verify designer ownership against the FormDefinition
  if (form.designerId.toString() !== designerId) return null;

  return gridFile;
}

/**
 * Get file metadata with ownership verification.
 *
 * @param {string} fileId - The GridFS file ID.
 * @param {string} designerId - The authenticated designer's user ID.
 * @returns {Promise<object|null>} Safe file metadata if owned, null otherwise.
 */
async function getFileWithOwnership(fileId, designerId) {
  const gridFile = await verifyFileOwnership(fileId, designerId);
  if (!gridFile) return null;

  return {
    id: gridFile._id.toString(),
    fileName: gridFile.filename,
    mimeType: (gridFile.metadata && gridFile.metadata.mimeType) || "application/octet-stream",
    size: (gridFile.metadata && gridFile.metadata.size) || gridFile.length || 0,
    responseId: gridFile.metadata && gridFile.metadata.responseId,
    formId: gridFile.metadata && gridFile.metadata.formId,
    fieldId: gridFile.metadata && gridFile.metadata.fieldId,
    category: gridFile.metadata && gridFile.metadata.category,
    uploadedAt: gridFile.metadata && gridFile.metadata.uploadedAt,
  };
}

/**
 * Open a download stream for a file after verifying ownership.
 *
 * @param {string} fileId - The GridFS file ID.
 * @param {string} designerId - The authenticated designer's user ID.
 * @returns {Promise<{stream: ReadableStream, metadata: object}|null>}
 *   The download stream and file metadata if authorized, null otherwise.
 */
async function downloadFile(fileId, designerId) {
  const gridFile = await verifyFileOwnership(fileId, designerId);
  if (!gridFile) return null;

  const stream = gridFs.createDownloadStream(fileId);
  if (!stream) return null;

  return {
    stream,
    metadata: {
      fileName: gridFile.filename,
      mimeType: (gridFile.metadata && gridFile.metadata.mimeType) || "application/octet-stream",
      size: gridFile.length || 0,
    },
  };
}

/**
 * Delete a file after verifying ownership.
 *
 * @param {string} fileId - The GridFS file ID.
 * @param {string} designerId - The authenticated designer's user ID.
 * @returns {Promise<boolean>} true if deleted, false if not found/unauthorized.
 */
async function deleteFileWithOwnership(fileId, designerId) {
  const gridFile = await verifyFileOwnership(fileId, designerId);
  if (!gridFile) return false;

  return gridFs.deleteFile(fileId);
}

module.exports = {
  verifyFileOwnership,
  getFileWithOwnership,
  downloadFile,
  deleteFileWithOwnership,
};
