const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');

const UPLOAD_DIR = path.join(env.uploadsDir, 'consultations');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_MIME_TYPES[file.mimetype]}`),
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    return cb(new ApiError(400, 'Unsupported file type. Allowed: JPG, PNG, WEBP, PDF'));
  }
  cb(null, true);
}

const uploadAttachments = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
}).array('attachments', 5);

module.exports = { uploadAttachments, UPLOAD_DIR };
