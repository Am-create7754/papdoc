const asyncHandler = require('../utils/asyncHandler');
const doctorService = require('../services/doctorService');

const getMe = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getOwnProfile(req.user._id);
  res.status(200).json({ success: true, data: doctor });
});

const updateMe = asyncHandler(async (req, res) => {
  const doctor = await doctorService.updateOwnProfile(req.user._id, req.body);
  res.status(200).json({ success: true, data: doctor });
});

const getPublicProfile = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getPublicProfile();
  res.status(200).json({ success: true, data: doctor });
});

module.exports = { getMe, updateMe, getPublicProfile };
