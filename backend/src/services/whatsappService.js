const Consultation = require('../models/Consultation');
const Patient = require('../models/Patient');
const { env } = require('../config/env');
const { consultationReferenceCode } = require('../utils/reference');
const prescriptionService = require('./prescriptionService');

const TIMEOUT_MS = 10000;

function normalizePhone(number) {
  return (number || '').replace(/[^\d]/g, '');
}

function maskPhone(number) {
  const digits = normalizePhone(number);
  if (digits.length <= 3) return '***';
  return `${'*'.repeat(digits.length - 3)}${digits.slice(-3)}`;
}

// Meta rejects template parameter text containing newlines/tabs or long runs of spaces.
function sanitizeTemplateParam(value, maxLength = 300) {
  return String(value ?? '')
    .replace(/[\n\t]+/g, ' ')
    .replace(/ {5,}/g, '    ')
    .trim()
    .slice(0, maxLength);
}

function buildTemplateParameters(consultation, patient) {
  const consultationTypeLabel = consultation.consultationType === 'priority' ? 'Priority' : 'Standard';
  return [
    patient.name,
    consultationTypeLabel,
    consultation.chiefComplaint,
    consultation.duration,
    consultationReferenceCode(consultation),
  ].map((value) => ({ type: 'text', text: sanitizeTemplateParam(value) }));
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

  let response;
  try {
    response = await callGraphApi({
      messaging_product: 'whatsapp',
      to: doctorNumber,
      type: 'template',
      template: {
        name: env.metaWhatsappTemplateName,
        language: { code: env.metaWhatsappTemplateLanguage },
        components: [
          {
            type: 'body',
            parameters: buildTemplateParameters(consultation, patient),
          },
        ],
      },
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
    return;
  }

  try {
    await prescriptionService.generatePrescription(consultation);
  } catch (err) {
    console.error('Prescription generation failed for consultation:', consultation._id.toString(), err.message);
  }
}

const STATUS_RANK = { sent: 1, delivered: 2, read: 3 };

async function processDeliveryStatus({ wamid, status, timestamp, errorCode, errorMessage }) {
  if (!wamid || !status) return;

  const consultation = await Consultation.findOne({ whatsappMessageId: wamid });
  if (!consultation) {
    console.warn('WhatsApp status ignored — no consultation matches outbound message id');
    return;
  }

  const eventTime = timestamp ? new Date(Number(timestamp) * 1000) : new Date();

  if (status === 'failed') {
    consultation.whatsappDeliveryStatus = 'failed';
    consultation.whatsappFailedAt = eventTime;
    consultation.whatsappFailureCode = errorCode != null ? String(errorCode) : undefined;
    consultation.whatsappFailureMessage = errorMessage ? String(errorMessage).slice(0, 500) : undefined;
  } else if (STATUS_RANK[status]) {
    const currentRank = STATUS_RANK[consultation.whatsappDeliveryStatus] || 0;
    if (STATUS_RANK[status] <= currentRank) {
      console.log('WhatsApp status ignored — duplicate or stale event for consultation:', consultation._id.toString());
      return;
    }
    consultation.whatsappDeliveryStatus = status;
    if (status === 'delivered') consultation.whatsappDeliveredAt = eventTime;
    if (status === 'read') consultation.whatsappReadAt = eventTime;
  } else {
    return; // unrecognized status type, ignore safely
  }

  try {
    await consultation.save();
    console.log('WhatsApp status updated for consultation:', consultation._id.toString(), '->', status);
  } catch (err) {
    console.warn('WhatsApp status save skipped:', err.message);
  }
}

// Video consultation alerts are operational-only free-text messages to the doctor — deliberately
// separate from sendConsultationToDoctor's templated, wamid-correlated flow above. They never
// set/read whatsappMessageId on a Consultation, so a doctor's WhatsApp reply to one of these can
// never be mistaken for a consultation reply and trigger prescription generation. Note: Meta only
// allows free-text delivery within the 24h customer-service window after the doctor last messaged
// in; outside that window this silently fails to send, which is acceptable since it's a
// best-effort operational nudge and the in-app doctor dashboard is the source of truth.
async function sendVideoOperationalAlert(text) {
  if (!env.metaWhatsappAccessToken || !env.metaWhatsappPhoneNumberId) {
    console.error('Video WhatsApp alert skipped — Meta credentials not configured');
    return;
  }

  const doctorNumber = normalizePhone(env.doctorWhatsappNumber);
  if (!doctorNumber || doctorNumber.length < 8) {
    console.error('Video WhatsApp alert skipped — DOCTOR_WHATSAPP_NUMBER is missing or invalid');
    return;
  }

  try {
    await callGraphApi({
      messaging_product: 'whatsapp',
      to: doctorNumber,
      type: 'text',
      text: { body: sanitizeTemplateParam(text, 500) },
    });
    console.log('Video WhatsApp alert sent to', maskPhone(doctorNumber));
  } catch (err) {
    console.error('Video WhatsApp alert failed:', err.message);
  }
}

module.exports = {
  sendConsultationToDoctor,
  processDoctorReply,
  processDeliveryStatus,
  sendVideoOperationalAlert,
  normalizePhone,
  maskPhone,
};
