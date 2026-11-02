const path = require('path');
const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { UPLOAD_DIR } = require('../middlewares/upload');
const prescriptionService = require('./prescriptionService');
const inputSafetyService = require('./consultationInputSafetyService');
const eligibilityService = require('./consultationEligibilityService');

const PATIENT_SUMMARY_FIELDS =
  '_id name email phone dateOfBirth gender location bloodGroup allergies existingMedicalConditions currentMedications emergencyContact';

// WhatsApp message IDs and the raw prescription filename are internal details never exposed via the API.
const HIDDEN_FIELDS =
  '-whatsappMessageId -doctorWhatsappReplyMessageId -prescriptionPdfFilename -prescriptionPdfFilenameHi';

const VIDEO_INELIGIBLE_MESSAGE =
  'Video Consultation is not available for this concern. Please choose Normal or Priority Consultation.';

// Shared by both the create-consultation authoritative path and the lightweight wizard
// pre-check endpoint, so the two can never drift apart.
function evaluateInput(patient, { chiefComplaint, symptoms, duration, additionalNotes }) {
  const safety = inputSafetyService.checkComplaintText(chiefComplaint);
  if (!safety.accepted) {
    return { inputAccepted: false, reasonCode: safety.reasonCode, message: safety.message, videoEligible: true };
  }

  const eligibility = eligibilityService.checkVideoEligibility({
    dateOfBirth: patient.dateOfBirth,
    chiefComplaint,
    symptoms,
    duration,
    additionalNotes,
  });

  return { inputAccepted: true, videoEligible: eligibility.videoEligible, reasonCode: eligibility.reasonCode };
}

async function precheckConsultationInput(patient, data) {
  return evaluateInput(patient, data);
}

async function createConsultation(patient, data, files = []) {
  const doctor = await Doctor.findOne({ isActive: true });
  if (!doctor) {
    throw new ApiError(503, 'No doctor is currently available');
  }

  const evaluation = evaluateInput(patient, data);

  if (!evaluation.inputAccepted) {
    console.warn(
      'Consultation input rejected:',
      evaluation.reasonCode,
      'patient:',
      patient._id.toString()
    );
    throw new ApiError(422, evaluation.message);
  }

  if (data.consultationType === 'video' && !evaluation.videoEligible) {
    console.warn(
      'Video consultation blocked by eligibility routing:',
      evaluation.reasonCode,
      'patient:',
      patient._id.toString()
    );
    throw new ApiError(422, VIDEO_INELIGIBLE_MESSAGE);
  }

  const attachments = files.map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));

  return Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: data.chiefComplaint,
    symptoms: data.symptoms,
    duration: data.duration,
    additionalNotes: data.additionalNotes || undefined,
    consultationType: data.consultationType,
    attachments,
    medicalHistorySnapshot: patient.existingMedicalConditions || [],
    currentMedicationsSnapshot: patient.currentMedications || [],
    allergiesSnapshot: patient.allergies || [],
    status: 'submitted',
    videoEligible: evaluation.videoEligible,
    videoEligibilityReasonCode: evaluation.reasonCode,
  });
}

async function getMyConsultations(patientId) {
  return Consultation.find({ patientId }).select(HIDDEN_FIELDS).sort({ createdAt: -1 });
}

async function getConsultationForPatient(consultationId, patientId) {
  const consultation = await Consultation.findById(consultationId).select(HIDDEN_FIELDS);
  if (!consultation || consultation.patientId.toString() !== patientId.toString()) {
    throw new ApiError(404, 'Consultation not found');
  }
  return consultation;
}

async function getDoctorConsultations() {
  return Consultation.find()
    .select(HIDDEN_FIELDS)
    .sort({ createdAt: -1 })
    .populate('patientId', 'name email phone');
}

async function getConsultationForDoctor(consultationId) {
  const consultation = await Consultation.findById(consultationId)
    .select(HIDDEN_FIELDS)
    .populate('patientId', PATIENT_SUMMARY_FIELDS);
  if (!consultation) {
    throw new ApiError(404, 'Consultation not found');
  }

  const previousConsultations = await Consultation.find({
    patientId: consultation.patientId._id,
    _id: { $ne: consultation._id },
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('chiefComplaint consultationType status createdAt');

  return { consultation, previousConsultations };
}

async function getAttachmentForRequester(consultationId, attachmentId, requester) {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new ApiError(404, 'Consultation not found');
  }

  const isOwner =
    requester.role === 'patient' && consultation.patientId.toString() === requester.user._id.toString();
  const isDoctor = requester.role === 'doctor';

  if (!isOwner && !isDoctor) {
    throw new ApiError(403, 'You do not have permission to access this file');
  }

  const attachment = consultation.attachments.id(attachmentId);
  if (!attachment) {
    throw new ApiError(404, 'Attachment not found');
  }

  return {
    filePath: path.join(UPLOAD_DIR, attachment.filename),
    mimeType: attachment.mimeType,
    originalName: attachment.originalName,
  };
}

// Secure fallback for when WhatsApp is unavailable — the doctor types a response directly on
// the website. Feeds the exact same prescription pipeline as the WhatsApp reply path
// (whatsappService.processDoctorReply): same fields, same status transition, same
// generatePrescription call. No separate prescription logic exists for this path.
async function submitManualDoctorReply(consultationId, doctorId, replyText) {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new ApiError(404, 'Consultation not found');
  }
  if (consultation.doctorId.toString() !== doctorId.toString()) {
    throw new ApiError(403, 'You do not have permission to respond to this consultation');
  }
  if (consultation.paymentStatus !== 'paid') {
    throw new ApiError(409, 'This consultation has not been paid for yet');
  }
  if (consultation.doctorReply) {
    throw new ApiError(409, 'This consultation already has a recorded response');
  }

  consultation.doctorReply = replyText;
  consultation.doctorRepliedAt = new Date();
  consultation.status = 'responded';
  await consultation.save();

  await prescriptionService.generatePrescription(consultation);

  return Consultation.findById(consultationId).select(HIDDEN_FIELDS);
}

module.exports = {
  createConsultation,
  getMyConsultations,
  getConsultationForPatient,
  getDoctorConsultations,
  getConsultationForDoctor,
  getAttachmentForRequester,
  submitManualDoctorReply,
  precheckConsultationInput,
};
