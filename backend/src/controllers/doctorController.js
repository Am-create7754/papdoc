const path = require('path');
const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const doctorService = require('../services/doctorService');
const ApiError = require('../utils/ApiError');
const { SIGNATURE_DIR } = require('../middlewares/signatureUpload');

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

const uploadSignature = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No signature image provided' });
  }
  const doctor = await doctorService.updateOwnSignature(req.user._id, req.file);
  res.status(200).json({ success: true, data: doctor });
});

const getSignatureImage = asyncHandler(async (req, res) => {
  // basename strips any path segments — prevents traversal regardless of input.
  const filename = path.basename(req.params.filename);
  const filePath = path.join(SIGNATURE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Signature image not found');
  }
  res.sendFile(filePath);
});

module.exports = { getMe, updateMe, getPublicProfile, uploadSignature, getSignatureImage };
