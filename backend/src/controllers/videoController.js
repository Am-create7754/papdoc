const asyncHandler = require('../utils/asyncHandler');
const videoService = require('../services/videoService');

const requesterFrom = (req) => ({ role: req.role, user: req.user });

const availability = asyncHandler(async (req, res) => {
  const data = await videoService.getAvailability();
  res.status(200).json({ success: true, data });
});

const getMy = asyncHandler(async (req, res) => {
  const data = await videoService.getMyLatestSession(req.user._id);
  res.status(200).json({ success: true, data });
});

const getOneForPatient = asyncHandler(async (req, res) => {
  const data = await videoService.getSessionForPatient(req.params.sessionId, req.user._id);
  res.status(200).json({ success: true, data });
});

const getDoctorQueue = asyncHandler(async (req, res) => {
  const data = await videoService.getDoctorQueueView(req.user._id);
  res.status(200).json({ success: true, data });
});

const getSummaryForConsultation = asyncHandler(async (req, res) => {
  const data = await videoService.getSessionSummaryForConsultation(req.params.consultationId, requesterFrom(req));
  res.status(200).json({ success: true, data });
});

const issueToken = asyncHandler(async (req, res) => {
  const data = await videoService.issueToken(req.params.sessionId, requesterFrom(req));
  res.status(200).json({ success: true, data });
});

const reportJoined = asyncHandler(async (req, res) => {
  const data = await videoService.reportJoined(req.params.sessionId, requesterFrom(req));
  res.status(200).json({ success: true, data });
});

const endSession = asyncHandler(async (req, res) => {
  const data = await videoService.endSession(req.params.sessionId, req.user._id);
  res.status(200).json({ success: true, data });
});

const cancelSession = asyncHandler(async (req, res) => {
  const data = await videoService.cancelSession(req.params.sessionId, req.user._id);
  res.status(200).json({ success: true, data });
});

const markNoShow = asyncHandler(async (req, res) => {
  const data = await videoService.markNoShow(req.params.sessionId, req.user._id, req.body.reason);
  res.status(200).json({ success: true, data });
});

module.exports = {
  availability,
  getMy,
  getOneForPatient,
  getDoctorQueue,
  getSummaryForConsultation,
  issueToken,
  reportJoined,
  endSession,
  cancelSession,
  markNoShow,
};
