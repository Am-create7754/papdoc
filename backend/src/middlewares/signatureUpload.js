const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');

const SIGNATURE_DIR = path.join(env.uploadsDir, 'signatures');
fs.mkdirSync(SIGNATURE_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SIGNATURE_DIR),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_MIME_TYPES[file.mimetype]}`),
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    return cb(new ApiError(400, 'Unsupported file type. Allowed: JPG, PNG, WEBP'));
  }
  cb(null, true);
}

const uploadSignature = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
}).single('signature');

module.exports = { uploadSignature, SIGNATURE_DIR };
