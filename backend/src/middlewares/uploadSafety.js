const fs = require('fs');
const ApiError = require('../utils/ApiError');

// Leading bytes of each allowed format. multer's `file.mimetype` is whatever the client claims,
// so without this check a renamed .exe/.html would be stored as an "image".
const SIGNATURES = {
  'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/png': (buf) =>
    buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (buf) =>
    buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP',
  'application/pdf': (buf) => buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-',
};

function uploadedFiles(req) {
  if (Array.isArray(req.files)) return req.files;
  if (req.file) return [req.file];
  return [];
}

function readHeader(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

function removeUploadedFiles(req) {
  for (const file of uploadedFiles(req)) {
    if (file.path) fs.unlink(file.path, () => {}); // best-effort; the file may already be gone
  }
}

// Mount BEFORE multer: once the response is sent, deletes anything multer wrote if the request
// ended in an error (failed validation, rejected content, service error) so no orphan files pile up.
function cleanupUploadsOnError(req, res, next) {
  res.on('finish', () => {
    if (res.statusCode >= 400) removeUploadedFiles(req);
  });
  next();
}

// Mount AFTER multer: rejects any file whose actual content doesn't match its declared type.
function verifyUploadedFileTypes(req, res, next) {
  for (const file of uploadedFiles(req)) {
    const matches = SIGNATURES[file.mimetype];
    let valid = false;
    try {
      valid = !!matches && matches(readHeader(file.path));
    } catch {
      valid = false;
    }
    if (!valid) {
      return next(new ApiError(400, 'One of the uploaded files is not a valid image or PDF'));
    }
  }
  next();
}

module.exports = { cleanupUploadsOnError, verifyUploadedFileTypes };
