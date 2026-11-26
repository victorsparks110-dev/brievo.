/**
 * File validation service.
 *
 * Server-side validation rules for uploaded files before they reach GridFS.
 * Rejects files that don't match BRIEVO's allowed types, size limits, or count.
 */

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/tiff",
  "image/bmp",
  "image/heic",
  "image/heif",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "text/rtf",
  "application/rtf",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/gzip",
  // Design files
  "application/illustrator",
  "application/x-photoshop",
  "image/vnd.adobe.photoshop",
  "application/postscript",
  "image/x-tiff",
  // Video
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  // Fonts
  "font/otf",
  "font/ttf",
  "font/woff",
  "font/woff2",
  "application/font-woff",
  "application/font-woff2",
])

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const MAX_FILES_PER_SUBMISSION = 20

/**
 * Validate a single file from multer against BRIEVO's rules.
 *
 * @param {object} file - Multer file object (has buffer, originalname, mimetype, size)
 * @returns {{ valid: boolean, error?: string }}
 */
function validateFile(file) {
  if (!file || !file.originalname) {
    return { valid: false, error: "Invalid file." }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File "${file.originalname}" exceeds the ${Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB size limit.`,
    }
  }

  if (file.size === 0) {
    return { valid: false, error: `File "${file.originalname}" is empty.` }
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return {
      valid: false,
      error: `File type "${file.mimetype}" is not allowed. Please upload a supported file format.`,
    }
  }

  return { valid: true }
}

/**
 * Validate an array of files from multer.
 *
 * @param {object[]} files - Array of multer file objects
 * @returns {{ valid: boolean, error?: string }}
 */
function validateFiles(files) {
  if (!files || files.length === 0) {
    return { valid: true }
  }

  if (files.length > MAX_FILES_PER_SUBMISSION) {
    return {
      valid: false,
      error: `Too many files. Maximum ${MAX_FILES_PER_SUBMISSION} files per submission.`,
    }
  }

  for (const file of files) {
    const result = validateFile(file)
    if (!result.valid) return result
  }

  return { valid: true }
}

module.exports = {
  validateFile,
  validateFiles,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_SUBMISSION,
}
