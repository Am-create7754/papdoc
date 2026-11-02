const fs = require('fs');
const path = require('path');
const Consultation = require('../models/Consultation');
const Patient = require('../models/Patient');
const { env } = require('../config/env');
const { consultationReferenceCode } = require('../utils/reference');
const prescriptionService = require('./prescriptionService');
const { UPLOAD_DIR } = require('../middlewares/upload');

const TIMEOUT_MS = 10000;

// --- Image header for consultation alerts ---------------------------------------------------
// WhatsApp image headers accept JPEG/PNG up to 5MB. A consultation without such a photo still
// needs *an* image (an image-header template always requires one), so it gets this default.
const WHATSAPP_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DEFAULT_ALERT_IMAGE = path.join(__dirname, '..', 'assets', 'images', 'whatsapp-no-photo.jpg');
// Meta keeps uploaded media for 30 days; re-uploading the default image daily is plenty safe.
const DEFAULT_IMAGE_CACHE_MS = 24 * 60 * 60 * 1000;
let defaultImageCache = null; // { id, uploadedAt }

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

// Priority consultations use the 🔴 priority template (patient, problem, since when, reference);
// everything else uses the standard consultation template. Either way it is the ONE message the
// doctor replies to — its wamid becomes whatsappMessageId, the reply -> prescription key.
function priorityTemplateParameters(consultation, patient) {
  return [patient.name, consultation.chiefComplaint, consultation.duration, consultationReferenceCode(consultation)].map(
    (value) => ({ type: 'text', text: sanitizeTemplateParam(value) })
  );
}

function consultationTemplate(name, parameters, imageId) {
  const components = [{ type: 'body', parameters }];
  if (imageId) components.unshift({ type: 'header', parameters: [{ type: 'image', image: { id: imageId } }] });
  return { name, language: { code: env.metaWhatsappTemplateLanguage }, components };
}

// The alert's header image (patient photo or default), or null when image headers are off or the
// upload failed — an alert must never be blocked by its picture.
async function alertImageId(consultation) {
  if (!env.metaWhatsappImageHeader) return null;
  try {
    return await headerImageIdFor(consultation);
  } catch (err) {
    console.error('WhatsApp alert image unavailable, sending without it:', err.message);
    return null;
  }
}

// Sends a template, with the image header when there is one. If Meta rejects that version (e.g.
// the template in Meta has no image header yet), the same template is resent text-only.
async function sendTemplateMessage(to, name, parameters, imageId) {
  const send = (image) =>
    callGraphApi({ messaging_product: 'whatsapp', to, type: 'template', template: consultationTemplate(name, parameters, image) });
  if (imageId) {
    try {
      return await send(imageId);
    } catch (err) {
      console.error(`WhatsApp alert with image (${name}) failed, retrying without image:`, err.message);
    }
  }
  return send(null);
}

function __resetMediaCacheForTests() {
  defaultImageCache = null;
}

// Uploads a local file to WhatsApp's media store and returns its media id — so the patient's
// photo goes straight to Meta, never via a public URL.
async function uploadMedia(filePath, mimeType) {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', new Blob([await fs.promises.readFile(filePath)], { type: mimeType }), path.basename(filePath));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://graph.facebook.com/${env.metaGraphApiVersion}/${env.metaWhatsappPhoneNumberId}/media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.metaWhatsappAccessToken}` },
        body: form,
        signal: controller.signal,
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.id) {
      throw new Error(`WhatsApp media upload failed: ${data?.error?.message || `HTTP ${res.status}`}`);
    }
    return data.id;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('WhatsApp media upload failed: request timed out');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function defaultImageId() {
  if (defaultImageCache && Date.now() - defaultImageCache.uploadedAt < DEFAULT_IMAGE_CACHE_MS) {
    return defaultImageCache.id;
  }
  const id = await uploadMedia(DEFAULT_ALERT_IMAGE, 'image/jpeg');
  defaultImageCache = { id, uploadedAt: Date.now() };
  return id;
}

// The patient's first JPEG/PNG attachment, else the default "No photo attached" image.
async function headerImageIdFor(consultation) {
  const photo = (consultation.attachments || []).find(
    (a) => WHATSAPP_IMAGE_TYPES.includes(a.mimeType) && a.size <= MAX_IMAGE_BYTES
  );
  if (photo) {
    try {
      return await uploadMedia(path.join(UPLOAD_DIR, path.basename(photo.filename)), photo.mimeType);
    } catch (err) {
      console.error('Patient photo upload failed, using default alert image:', err.message);
    }
  }
  return defaultImageId();
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

  const isPriority = consultation.consultationType === 'priority';
  const imageId = await alertImageId(consultation);
  const sendTemplate = (name, parameters) => sendTemplateMessage(doctorNumber, name, parameters, imageId);

  let response;
  try {
    if (isPriority) {
      try {
        response = await sendTemplate(
          env.metaWhatsappPriorityAlertTemplateName,
          priorityTemplateParameters(consultation, patient)
        );
      } catch (err) {
        // e.g. the priority template isn't approved yet — the doctor must still get a message
        // they can reply to, so fall back to the standard consultation template.
        console.error('Priority template failed, falling back to standard alert:', err.message);
        response = await sendTemplate(env.metaWhatsappTemplateName, buildTemplateParameters(consultation, patient));
      }
    } else {
      response = await sendTemplate(env.metaWhatsappTemplateName, buildTemplateParameters(consultation, patient));
    }
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
  if (isPriority) {
    consultation.priorityAlertSentAt = consultation.whatsappNotifiedAt;
    consultation.priorityAlertMessageId = wamid;
  }
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

// --- Operational alert (🔵 video) -------------------------------------------------------------
//
// (The 🔴 priority alert is no longer a separate message: it is sent by sendConsultationToDoctor
// as the single reply-able alert for priority consultations.)
//
// The video alert below is a genuine Meta-approved TEMPLATE message — unlike
// sendVideoOperationalAlert's free-text nudges above, a template is required to reliably deliver
// outside the 24h customer-service window and to attach the "Join video call" button. It never
// writes whatsappMessageId or doctorWhatsappReplyMessageId — the reply -> prescription correlation
// key — so a doctor replying to it finds no consultation match and nothing happens. Idempotency
// is a real atomic claim (findOneAndUpdate on an unset sentAt field), since payment verification
// and the Razorpay webhook can both reach it for the same consultation.

async function sendVideoConsultationAlert(consultation, patient, queuePosition) {
  const claimed = await Consultation.findOneAndUpdate(
    { _id: consultation._id, videoAlertSentAt: { $exists: false } },
    { $set: { videoAlertSentAt: new Date() } }
  );
  if (!claimed) {
    console.log('Video WhatsApp alert skipped — already sent for consultation:', consultation._id.toString());
    return;
  }

  if (!env.metaWhatsappAccessToken || !env.metaWhatsappPhoneNumberId) {
    console.error('Video WhatsApp alert skipped — Meta credentials not configured');
    return;
  }
  const doctorNumber = normalizePhone(env.doctorWhatsappNumber);
  if (!doctorNumber || doctorNumber.length < 8) {
    console.error('Video WhatsApp alert skipped — DOCTOR_WHATSAPP_NUMBER is missing or invalid');
    return;
  }

  const parameters = [patient.name, consultation.chiefComplaint, String(queuePosition ?? 1), consultationReferenceCode(consultation)]
    .map((value) => ({ type: 'text', text: sanitizeTemplateParam(value) }));

  // Same image header as the consultation alerts. The "Join video call" button is a static
  // "Visit Website" URL (/doctor/video) configured once in Meta Manager — no button component is
  // needed since the doctor's video screen always shows whichever session is current.
  const imageId = await alertImageId(consultation);

  let response;
  try {
    response = await sendTemplateMessage(doctorNumber, env.metaWhatsappVideoAlertTemplateName, parameters, imageId);
  } catch (err) {
    console.error('Video WhatsApp alert failed for consultation:', consultation._id.toString(), err.message);
    return;
  }

  const wamid = response?.messages?.[0]?.id;
  if (wamid) {
    await Consultation.findByIdAndUpdate(consultation._id, { videoAlertMessageId: wamid }).catch(() => {});
  }
  console.log('Video WhatsApp alert (🔵 template) sent for consultation:', consultation._id.toString());
}

module.exports = {
  sendConsultationToDoctor,
  processDoctorReply,
  processDeliveryStatus,
  sendVideoOperationalAlert,
  sendVideoConsultationAlert,
  normalizePhone,
  maskPhone,
  __resetMediaCacheForTests,
};
