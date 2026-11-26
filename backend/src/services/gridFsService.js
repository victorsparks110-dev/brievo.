const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");

/**
 * GridFS service.
 *
 * Low-level wrapper around MongoDB GridFSBucket for BRIEVO file storage.
 * Provides upload, download, delete, and metadata operations.
 *
 * This service does NOT handle ownership verification — that is the
 * responsibility of fileService.js which sits above this layer.
 */

const BUCKET_NAME = "brievoFiles";

let bucket = null;

/**
 * Get (or lazily create) the shared GridFSBucket instance.
 * Reuses the active Mongoose/MongoDB connection.
 */
function getBucket() {
  if (bucket) return bucket;

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection is not available. Ensure connectDatabase() has been called.");
  }

  bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  return bucket;
}

/**
 * Upload a readable stream to GridFS.
 *
 * @param {ReadableStream} fileStream - The file data stream.
 * @param {string} fileName - Original file name.
 * @param {object} metadata - Metadata to associate with the GridFS file.
 * @param {string} metadata.mimeType - MIME type of the file.
 * @param {number} metadata.size - File size in bytes.
 * @param {string} [metadata.responseId] - Associated FormResponse ID.
 * @param {string} [metadata.formId] - Associated FormDefinition ID.
 * @param {string} [metadata.designerId] - Owning designer's User ID.
 * @param {string} [metadata.fieldId] - Form field the file belongs to.
 * @param {string} [metadata.category] - Project/brand_asset/reference.
 * @returns {Promise<ObjectId>} The GridFS file ID.
 */
function uploadFile(fileStream, fileName, metadata) {
  return new Promise((resolve, reject) => {
    const b = getBucket();

    const uploadStream = b.openUploadStream(fileName, {
      metadata: {
        mimeType: metadata.mimeType || "application/octet-stream",
        size: metadata.size || 0,
        responseId: metadata.responseId || null,
        formId: metadata.formId || null,
        designerId: metadata.designerId || null,
        fieldId: metadata.fieldId || null,
        category: metadata.category || null,
        uploadedAt: new Date(),
      },
    });

    fileStream.pipe(uploadStream);

    uploadStream.on("finish", () => {
      resolve(uploadStream.id);
    });

    uploadStream.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Get metadata for a GridFS file by its ID.
 *
 * @param {string|ObjectId} fileId - The GridFS file ID.
 * @returns {Promise<object|null>} The file document from brievoFiles.files, or null.
 */
async function getFileMetadata(fileId) {
  const db = mongoose.connection.db;
  if (!db) return null;

  let oid;
  try {
    oid = new ObjectId(String(fileId));
  } catch {
    return null;
  }

  const file = await db.collection(`${BUCKET_NAME}.files`).findOne({ _id: oid });
  return file || null;
}

/**
 * Open a download stream for a GridFS file.
 *
 * @param {string|ObjectId} fileId - The GridFS file ID.
 * @returns {ReadableStream|null} A readable stream, or null if file not found.
 */
function createDownloadStream(fileId) {
  const b = getBucket();

  let oid;
  try {
    oid = new ObjectId(String(fileId));
  } catch {
    return null;
  }

  // GridFSBucket.openDownloadStream throws if ID is invalid, so wrap it.
  try {
    return b.openDownloadStream(oid);
  } catch {
    return null;
  }
}

/**
 * Delete a file and its chunks from GridFS.
 *
 * @param {string|ObjectId} fileId - The GridFS file ID.
 * @returns {Promise<boolean>} true if deleted, false if not found.
 */
async function deleteFile(fileId) {
  const b = getBucket();

  let oid;
  try {
    oid = new ObjectId(String(fileId));
  } catch {
    return false;
  }

  try {
    await b.delete(oid);
    return true;
  } catch (err) {
    // GridFSBucket.delete throws GridFSFileNotFoundError when file does not exist.
    if (err.message && err.message.includes("FileNotFound")) {
      return false;
    }
    throw err;
  }
}

/**
 * Check whether a file exists in GridFS.
 *
 * @param {string|ObjectId} fileId - The GridFS file ID.
 * @returns {Promise<boolean>}
 */
async function fileExists(fileId) {
  const metadata = await getFileMetadata(fileId);
  return metadata !== null;
}

module.exports = {
  getBucket,
  BUCKET_NAME,
  uploadFile,
  getFileMetadata,
  createDownloadStream,
  deleteFile,
  fileExists,
};
