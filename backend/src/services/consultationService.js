const path = require('path');
const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { UPLOAD_DIR } = require('../middlewares/upload');

const PATIENT_SUMMARY_FIELDS =
  '_id name email phone dateOfBirth gender location bloodGroup allergies existingMedicalConditions currentMedications emergencyContact';

// WhatsApp message IDs and the raw prescription filename are internal details never exposed via the API.
const HIDDEN_FIELDS =
  '-whatsappMessageId -doctorWhatsappReplyMessageId -prescriptionPdfFilename -prescriptionPdfFilenameHi';

async function createConsultation(patient, data, files = []) {
  const doctor = await Doctor.findOne({ isActive: true });
  if (!doctor) {
    throw new ApiError(503, 'No doctor is currently available');
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

module.exports = {
  createConsultation,
  getMyConsultations,
  getConsultationForPatient,
  getDoctorConsultations,
  getConsultationForDoctor,
  getAttachmentForRequester,
};
