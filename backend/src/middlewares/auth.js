const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/jwt');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication token missing');
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const Model = payload.role === 'doctor' ? Doctor : payload.role === 'patient' ? Patient : null;
  if (!Model) {
    throw new ApiError(401, 'Invalid token');
  }

  const user = await Model.findById(payload.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Account not found or inactive');
  }

  req.user = user;
  req.role = payload.role;
  next();
});

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.role || !roles.includes(req.role)) {
      throw new ApiError(403, 'You do not have permission to access this resource');
    }
    next();
  };
}

module.exports = { authenticate, authorize };
