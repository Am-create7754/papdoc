const Consultation = require('../models/Consultation');
const Patient = require('../models/Patient');
const { env } = require('../config/env');

const TIMEOUT_MS = 10000;

function normalizePhone(number) {
  return (number || '').replace(/[^\d]/g, '');
}

function maskPhone(number) {
  const digits = normalizePhone(number);
  if (digits.length <= 3) return '***';
  return `${'*'.repeat(digits.length - 3)}${digits.slice(-3)}`;
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const diffMs = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

function referenceCode(consultation) {
  return `HF-${consultation._id.toString().slice(-6).toUpperCase()}`;
}

function buildConsultationMessage(consultation, patient) {
  const age = calculateAge(patient.dateOfBirth);
  const lines = [
    'New Healthify Consultation',
    '',
    `Patient: ${patient.name}`,
    `Age: ${age ?? 'N/A'}`,
    `Gender: ${patient.gender ? patient.gender[0].toUpperCase() + patient.gender.slice(1) : 'N/A'}`,
    `Consultation Type: ${consultation.consultationType === 'priority' ? 'Priority' : 'Standard'}`,
    '',
    'Chief Complaint:',
    consultation.chiefComplaint,
    '',
    'Symptoms:',
    consultation.symptoms.map((s) => `• ${s}`).join('\n'),
    '',
    `Duration: ${consultation.duration}`,
    '',
    `Allergies: ${consultation.allergiesSnapshot?.length ? consultation.allergiesSnapshot.join(', ') : 'None reported'}`,
    `Current Medications: ${
      consultation.currentMedicationsSnapshot?.length ? consultation.currentMedicationsSnapshot.join(', ') : 'None reported'
    }`,
    `Medical Conditions: ${
      consultation.medicalHistorySnapshot?.length ? consultation.medicalHistorySnapshot.join(', ') : 'None reported'
    }`,
  ];

  if (consultation.additionalNotes) {
    lines.push('', 'Additional Notes:', consultation.additionalNotes);
  }

  lines.push(
    '',
    'Payment: Verified',
    `Consultation ID: ${referenceCode(consultation)}`,
    '',
    'Please reply directly to THIS message with your response/prescription notes.'
  );

  return lines.join('\n');
}

async function callGraphApi(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://graph.facebook.com/${env.metaGraphApiVersion}/${env.metaWhatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.metaWhatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const metaMessage = data?.error?.message || `HTTP ${res.status}`;
      console.error('Meta WhatsApp API error:', { status: res.status, message: metaMessage });
      throw new Error(`WhatsApp message failed: ${metaMessage}`);
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('WhatsApp message failed: request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendConsultationToDoctor(consultation) {
  if (consultation.whatsappMessageId) {
    console.log('WhatsApp notification skipped — already notified:', consultation._id.toString());
    return;
  }

  if (!env.metaWhatsappAccessToken || !env.metaWhatsappPhoneNumberId) {
    console.error('WhatsApp send skipped — Meta credentials not configured');
    return;
  }

  const doctorNumber = normalizePhone(env.doctorWhatsappNumber);
  if (!doctorNumber || doctorNumber.length < 8) {
    console.error('WhatsApp send skipped — DOCTOR_WHATSAPP_NUMBER is missing or invalid');
    return;
  }

  const patient = await Patient.findById(consultation.patientId);
  if (!patient) {
    console.error('WhatsApp send skipped — patient not found for consultation:', consultation._id.toString());
    return;
  }

  console.log('WhatsApp send started for consultation:', consultation._id.toString(), 'to', maskPhone(doctorNumber));

  const message = buildConsultationMessage(consultation, patient);

  let response;
  try {
    response = await callGraphApi({
      messaging_product: 'whatsapp',
      to: doctorNumber,
      type: 'text',
      text: { body: message },
    });
  } catch (err) {
    console.error('WhatsApp send failed for consultation:', consultation._id.toString(), err.message);
    return;
  }

  const wamid = response?.messages?.[0]?.id;
  if (!wamid) {
    console.error('WhatsApp send returned no message id for consultation:', consultation._id.toString());
    return;
  }

  consultation.whatsappMessageId = wamid;
  consultation.whatsappNotifiedAt = new Date();
  consultation.status = 'under_review';
  await consultation.save();

  console.log('WhatsApp send successful, wamid stored for consultation:', consultation._id.toString());
}

async function processDoctorReply({ from, messageId, text, contextId }) {
  if (!contextId) {
    console.warn('WhatsApp reply ignored — missing message context');
    return;
  }

  const senderDigits = normalizePhone(from);
  const doctorDigits = normalizePhone(env.doctorWhatsappNumber);
  if (!doctorDigits || senderDigits !== doctorDigits) {
    console.warn('WhatsApp reply ignored — sender is not the configured doctor:', maskPhone(from));
    return;
  }

  const consultation = await Consultation.findOne({ whatsappMessageId: contextId });
  if (!consultation) {
    console.warn('WhatsApp reply ignored — no consultation matches outbound message id');
    return;
  }

  if (consultation.doctorWhatsappReplyMessageId === messageId) {
    console.log('WhatsApp reply ignored — duplicate delivery for consultation:', consultation._id.toString());
    return;
  }

  if (consultation.doctorWhatsappReplyMessageId) {
    console.log('WhatsApp reply ignored — consultation already has a recorded reply:', consultation._id.toString());
    return;
  }

  consultation.doctorReply = text;
  consultation.doctorWhatsappReplyMessageId = messageId;
  consultation.doctorRepliedAt = new Date();
  consultation.status = 'responded';

  try {
    await consultation.save();
    console.log('Doctor reply matched and stored for consultation:', consultation._id.toString());
  } catch (err) {
    console.warn('WhatsApp reply save skipped (likely duplicate):', err.message);
  }
}

module.exports = {
  sendConsultationToDoctor,
  processDoctorReply,
  normalizePhone,
  maskPhone,
};
