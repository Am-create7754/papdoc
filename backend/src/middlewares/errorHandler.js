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

  console.error(err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
}

module.exports = errorHandler;
