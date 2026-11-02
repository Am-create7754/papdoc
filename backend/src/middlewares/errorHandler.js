const multer = require('multer');
const ApiError = require('../utils/ApiError');

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each file must be 5MB or smaller'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'You can attach a maximum of 5 files'
          : err.message;
    return res.status(400).json({ success: false, message });
  }

  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate value for a unique field' });
  }

  // Malformed ids in the URL (e.g. /consultations/abc) — a bad request, not a server fault.
  if (err.name === 'CastError') {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Invalid data provided' });
  }

  // Thrown by express.json() for unparseable or oversized bodies.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large' });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Origin not allowed' });
  }

  // Full details stay in the server log; the client only ever sees a generic message, so stack
  // traces, query details and file paths never leak.
  console.error(err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
}

module.exports = errorHandler;
