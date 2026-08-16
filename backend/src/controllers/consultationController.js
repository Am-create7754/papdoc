const asyncHandler = require('../utils/asyncHandler');
const consultationService = require('../services/consultationService');

const create = asyncHandler(async (req, res) => {
  const consultation = await consultationService.createConsultation(req.user, req.body, req.files);
  res.status(201).json({ success: true, data: consultation });
});

const getMy = asyncHandler(async (req, res) => {
  const consultations = await consultationService.getMyConsultations(req.user._id);
  res.status(200).json({ success: true, data: consultations });
});

const getOneForPatient = asyncHandler(async (req, res) => {
  const consultation = await consultationService.getConsultationForPatient(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: consultation });
});

const getAllForDoctor = asyncHandler(async (req, res) => {
  const consultations = await consultationService.getDoctorConsultations();
  res.status(200).json({ success: true, data: consultations });
});

const getOneForDoctor = asyncHandler(async (req, res) => {
  const { consultation, previousConsultations } = await consultationService.getConsultationForDoctor(
    req.params.id
  );
  res.status(200).json({ success: true, data: { consultation, previousConsultations } });
});

const getAttachment = asyncHandler(async (req, res) => {
  const { filePath, mimeType, originalName } = await consultationService.getAttachmentForRequester(
    req.params.id,
    req.params.attachmentId,
    { role: req.role, user: req.user }
  );
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
  res.sendFile(filePath);
});

module.exports = { create, getMy, getOneForPatient, getAllForDoctor, getOneForDoctor, getAttachment };
