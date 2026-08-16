const asyncHandler = require('../utils/asyncHandler');
const patientService = require('../services/patientService');

const getMe = asyncHandler(async (req, res) => {
  const patient = await patientService.getOwnProfile(req.user._id);
  res.status(200).json({ success: true, data: patient });
});

const updateMe = asyncHandler(async (req, res) => {
  const patient = await patientService.updateOwnProfile(req.user._id, req.body);
  res.status(200).json({ success: true, data: patient });
});

module.exports = { getMe, updateMe };
