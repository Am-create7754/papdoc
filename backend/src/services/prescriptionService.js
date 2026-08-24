const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const { consultationReferenceCode } = require('../utils/reference');
const { SIGNATURE_DIR } = require('../middlewares/signatureUpload');

const PRESCRIPTION_DIR = path.join(__dirname, '..', '..', 'uploads', 'prescriptions');
fs.mkdirSync(PRESCRIPTION_DIR, { recursive: true });

// Noto Sans Devanagari (SIL Open Font License) — the standard PDF base fonts have no
// Devanagari glyphs, so Hindi-language prescriptions embed this font instead.
const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const DEVANAGARI_REGULAR = fs.readFileSync(path.join(FONTS_DIR, 'NotoSansDevanagari-Regular.ttf'));
const DEVANAGARI_BOLD = fs.readFileSync(path.join(FONTS_DIR, 'NotoSansDevanagari-Bold.ttf'));

// White-on-transparent medical emblem shown top-right of every prescription's header —
// a fixed brand mark, independent of any doctor's uploaded signature.
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const DOCTOR_SYMBOL = fs.readFileSync(path.join(IMAGES_DIR, 'doctor-symbol.png'));

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = '#1F2937';
const MUTED = '#64748B';
const PRIMARY = '#0F766E';
const PRIMARY_DARK = '#115E59';
const MINT = '#DFF5EF';
const SURFACE = '#F7FAF9';
const LINE = '#E5E7EB';
const WHITE = '#FFFFFF';

const HEADER_H = 118;
const FOOTER_H = 56;
const FOOTER_TOP = PAGE_H - FOOTER_H;

const LABELS = {
  en: {
    patientName: 'PATIENT NAME',
    date: 'DATE',
    ageGender: 'AGE / GENDER',
    phone: 'PHONE',
    ref: 'CONSULTATION REF.',
    address: 'ADDRESS',
    chiefComplaint: 'CHIEF COMPLAINT',
    medicineAdvice: 'MEDICINE / ADVICE',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    na: 'N/A',
    generatedOn: (d) => `Generated via Healthify on ${d}`,
  },
  hi: {
    patientName: 'मरीज़ का नाम',
    date: 'तारीख़',
    ageGender: 'उम्र / लिंग',
    phone: 'फ़ोन',
    ref: 'परामर्श संदर्भ',
    address: 'पता',
    chiefComplaint: 'मुख्य समस्या',
    medicineAdvice: 'दवा / सलाह',
    male: 'पुरुष',
    female: 'महिला',
    other: 'अन्य',
    na: 'लागू नहीं',
    generatedOn: (d) => `Healthify द्वारा ${d} को जनरेट किया गया`,
  },
};

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const diffMs = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

async function tryFetchImageBuffer(url) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// doctor.signatureImage is either a bare filename (uploaded via Healthify) or a full URL (legacy/external).
async function resolveSignatureBuffer(doctor) {
  const value = doctor.signatureImage;
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return tryFetchImageBuffer(value);
  try {
    const filePath = path.join(SIGNATURE_DIR, path.basename(value));
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
  } catch {
    // fall through to null
  }
  return null;
}

function doctorDisplayName(doctor) {
  const name = doctor.fullName.trim();
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

// Two-letter monogram from the doctor's actual name (first + last word), stripping any
// leading "Dr." already in the profile — e.g. "Alok Kumar Sahay" -> "AS".
function doctorMonogram(doctor) {
  const words = doctor.fullName.trim().replace(/^dr\.?\s+/i, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'H';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Universal medical mark (ring + rounded cross) drawn dynamically — no external artwork —
// used as the seal fallback when no signature image is available, and as the watermark.
function drawMedicalMark(doc, { x, y, radius, color }) {
  doc.save();
  doc.circle(x, y, radius).lineWidth(1.5).strokeColor(color).stroke();
  doc.circle(x, y, radius - 5).lineWidth(0.75).strokeColor(color).stroke();
  const armThickness = radius * 0.32;
  const armLength = radius * 0.95;
  doc.fillColor(color);
  doc.roundedRect(x - armThickness / 2, y - armLength / 2, armThickness, armLength, armThickness / 2).fill();
  doc.roundedRect(x - armLength / 2, y - armThickness / 2, armLength, armThickness, armThickness / 2).fill();
  doc.restore();
}

// Real doctor stamp/signature, cropped to a circle — used when the doctor has uploaded one.
function drawImageSeal(doc, buffer, { x, y, radius, ring }) {
  doc.save();
  try {
    doc.circle(x, y, radius).clip();
    doc.image(buffer, x - radius, y - radius, { cover: [radius * 2, radius * 2] });
  } catch {
    doc.restore();
    return false;
  }
  doc.restore();
  doc.circle(x, y, radius).lineWidth(1.5).strokeColor(ring).stroke();
  return true;
}

// Faint background mark — kept very low-opacity and thin-lined so body text stays fully
// readable even where it overlaps (a solid letterform reads as "hiding" text; a light
// ring-and-cross mark doesn't).
function drawWatermark(doc) {
  const cx = PAGE_W / 2;
  const cy = (HEADER_H + FOOTER_TOP) / 2;
  const r = 110;
  doc.save();
  doc.opacity(0.06);
  drawMedicalMark(doc, { x: cx, y: cy, radius: r, color: PRIMARY });
  doc.restore();
}

async function renderPdf({ doctor, patient, consultation, reference, filePath, lang }) {
  const t = LABELS[lang] || LABELS.en;
  const signatureBuffer = await resolveSignatureBuffer(doctor);
  const monogram = doctorMonogram(doctor);

  const regularFont = lang === 'hi' ? 'Deva' : 'Helvetica';
  const boldFont = lang === 'hi' ? 'Deva-Bold' : 'Helvetica-Bold';

  return new Promise((resolve, reject) => {
    // bottom:0 — the footer band is placed at absolute coordinates near the physical page
    // edge; a non-zero bottom margin makes pdfkit auto-paginate once the cursor passes it.
    const doc = new PDFDocument({ size: 'A4', margins: { top: MARGIN, bottom: 0, left: MARGIN, right: MARGIN } });
    doc.registerFont('Deva', DEVANAGARI_REGULAR);
    doc.registerFont('Deva-Bold', DEVANAGARI_BOLD);

    const stream = fs.createWriteStream(filePath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    // ---- Header band (bleeds to page edges) ----
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(PRIMARY);
    doc.rect(0, HEADER_H - 4, PAGE_W, 4).fill(PRIMARY_DARK);

    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9).text('HEALTHIFY', MARGIN, 22, { characterSpacing: 1.5 });
    doc.font(boldFont).fontSize(18).text(doctorDisplayName(doctor), MARGIN, 36, { width: 360 });

    const subLine = [doctor.specialization, doctor.qualifications?.length ? doctor.qualifications.join(', ') : null]
      .filter(Boolean)
      .join(' · ');
    if (subLine) doc.font(regularFont).fontSize(9.5).fillColor(MINT).text(subLine, MARGIN, 60, { width: 360 });

    const regLine = [
      doctor.medicalRegistrationNumber ? `Reg. No: ${doctor.medicalRegistrationNumber}` : null,
      doctor.clinicName,
    ]
      .filter(Boolean)
      .join('   |   ');
    if (regLine) doc.font(regularFont).fontSize(9).fillColor(MINT).text(regLine, MARGIN, 76, { width: 360 });

    // Seal, top-right of the header band — always the medical emblem, not the doctor's
    // signature (the signature belongs at the bottom of the document, next to their name).
    drawImageSeal(doc, DOCTOR_SYMBOL, { x: PAGE_W - MARGIN - 30, y: 59, radius: 30, ring: WHITE });

    // ---- Faint watermark behind the body ----
    drawWatermark(doc);

    // ---- Patient info card ----
    // Height is derived from the actual rows/wrapped text present, not a fixed guess —
    // a long address wraps to multiple lines and must not spill past the card background.
    let y = HEADER_H + 26;
    const hasPhone = !!patient.phone;
    const hasAddress = !!patient.location;

    const col1 = MARGIN + 20;
    const col2 = MARGIN + CONTENT_W / 2 + 10;
    const addressWidth = CONTENT_W - 40;
    const topPad = 18;
    const rowSpacing = 36;
    const labelGap = 12;

    doc.font(regularFont).fontSize(10.5);
    const addressHeight = hasAddress ? doc.heightOfString(patient.location, { width: addressWidth }) : 0;

    let cursor = topPad + rowSpacing; // past name/date row, at age/gender row
    const row2Offset = cursor;
    cursor += rowSpacing; // past age/gender row
    let phoneOffset = null;
    let addressOffset = null;
    if (hasPhone) {
      phoneOffset = cursor;
      cursor += rowSpacing;
    }
    if (hasAddress) {
      addressOffset = cursor;
      cursor += labelGap + addressHeight;
    }
    const cardH = cursor + 16;

    doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 8).fillColor(SURFACE).fill();
    doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 8).lineWidth(1).strokeColor(LINE).stroke();

    const rowY = y + topPad;

    function row(x, ry, width, label, value) {
      if (!value) return;
      doc.font(boldFont).fontSize(9).fillColor(MUTED).text(label, x, ry, { width });
      doc.font(regularFont).fontSize(10.5).fillColor(INK).text(value, x, ry + labelGap, { width });
    }

    const genderLabel = patient.gender ? t[patient.gender] || patient.gender : t.na;
    row(col1, rowY, 200, t.patientName, patient.name);
    row(col2, rowY, 190, t.date, new Date().toLocaleDateString());
    row(col1, y + row2Offset, 200, t.ageGender, `${calculateAge(patient.dateOfBirth) ?? t.na} / ${genderLabel}`);
    row(col2, y + row2Offset, 190, t.ref, reference);

    if (hasPhone) row(col1, y + phoneOffset, 200, t.phone, patient.phone);
    if (hasAddress) row(col1, y + addressOffset, addressWidth, t.address, patient.location);

    y += cardH + 22;

    // ---- Chief complaint ----
    doc.font(boldFont).fontSize(9.5).fillColor(PRIMARY_DARK).text(t.chiefComplaint, MARGIN, y);
    doc
      .font(regularFont)
      .fontSize(10.5)
      .fillColor(INK)
      .text(consultation.chiefComplaint, MARGIN, y + 14, { width: CONTENT_W });
    y = doc.y + 20;

    doc
      .strokeColor(LINE)
      .lineWidth(1)
      .moveTo(MARGIN, y)
      .lineTo(MARGIN + CONTENT_W, y)
      .stroke();
    y += 22;

    // ---- Rx section — the doctor's own reply, verbatim, never altered or parsed ----
    doc.font('Times-Bold').fontSize(28).fillColor(PRIMARY).text(monogram, MARGIN, y);
    const rxMarkBottom = doc.y;

    const rxTextX = MARGIN + 54;
    const rxTextWidth = CONTENT_W - 54;
    doc.font(boldFont).fontSize(9.5).fillColor(PRIMARY_DARK).text(t.medicineAdvice, rxTextX, y - 2, {
      width: rxTextWidth,
    });
    doc
      .font(regularFont)
      .fontSize(14)
      .fillColor(INK)
      .text(String(consultation.doctorReply).replace(/\r\n/g, '\n'), rxTextX, doc.y + 4, {
        width: rxTextWidth,
        lineGap: 5,
      });

    y = Math.max(doc.y, rxMarkBottom) + 30;

    // ---- Signature area (bottom-right, above the footer) ----
    const sigReserve = 90;
    let sigTop = Math.max(y, FOOTER_TOP - sigReserve - 20);
    if (y > FOOTER_TOP - sigReserve - 20) {
      sigTop = y; // content ran long — flow signature right after it instead of overlapping the footer
    }
    const sigX = MARGIN + CONTENT_W - 200;

    if (signatureBuffer) {
      try {
        doc.image(signatureBuffer, sigX, sigTop, { fit: [180, 46] });
      } catch {
        // Unsupported/corrupt image — fall back to the printed name line below.
      }
    }
    doc
      .strokeColor(INK)
      .lineWidth(1)
      .moveTo(sigX, sigTop + 52)
      .lineTo(sigX + 200, sigTop + 52)
      .stroke();
    doc.font(boldFont).fontSize(10).fillColor(INK).text(doctorDisplayName(doctor), sigX, sigTop + 58, {
      width: 200,
    });
    if (doctor.specialization) {
      doc.font(regularFont).fontSize(8.5).fillColor(MUTED).text(doctor.specialization, sigX, sigTop + 71, {
        width: 200,
      });
    }

    // ---- Footer band ----
    doc.rect(0, FOOTER_TOP, PAGE_W, FOOTER_H).fill(SURFACE);
    doc.rect(0, FOOTER_TOP, PAGE_W, 1.5).fill(PRIMARY);

    const footerParts = [doctor.clinicAddress, doctor.email].filter(Boolean);
    doc
      .font(boldFont)
      .fontSize(9.5)
      .fillColor(PRIMARY_DARK)
      .text(doctor.clinicName || 'Healthify', MARGIN, FOOTER_TOP + 12, { width: CONTENT_W });
    if (footerParts.length) {
      doc
        .font(regularFont)
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(footerParts.join('   •   '), MARGIN, FOOTER_TOP + 27, { width: CONTENT_W });
    }
    doc
      .font(regularFont)
      .fontSize(7.5)
      .fillColor('#94A3B8')
      .text(t.generatedOn(new Date().toLocaleString()), MARGIN, FOOTER_TOP + 40, { width: CONTENT_W });

    doc.end();
  });
}

async function generatePrescription(consultation) {
  if (consultation.prescriptionStatus === 'generated' && consultation.prescriptionPdfFilename) {
    const existingPath = path.join(PRESCRIPTION_DIR, consultation.prescriptionPdfFilename);
    if (fs.existsSync(existingPath)) {
      console.log('Prescription generation skipped — already generated for consultation:', consultation._id.toString());
      return;
    }
  }

  console.log('Prescription generation started for consultation:', consultation._id.toString());

  try {
    const [doctor, patient] = await Promise.all([
      Doctor.findById(consultation.doctorId),
      Patient.findById(consultation.patientId),
    ]);

    if (!doctor) throw new Error('Doctor profile not found');
    if (!patient) throw new Error('Patient profile not found');
    if (!consultation.doctorReply) throw new Error('No doctor reply available to generate prescription from');

    const reference = consultationReferenceCode(consultation);

    const filenameEn = `${crypto.randomUUID()}.pdf`;
    await renderPdf({
      doctor,
      patient,
      consultation,
      reference,
      filePath: path.join(PRESCRIPTION_DIR, filenameEn),
      lang: 'en',
    });

    const filenameHi = `${crypto.randomUUID()}.pdf`;
    await renderPdf({
      doctor,
      patient,
      consultation,
      reference,
      filePath: path.join(PRESCRIPTION_DIR, filenameHi),
      lang: 'hi',
    });

    consultation.prescriptionStatus = 'generated';
    consultation.prescriptionGeneratedAt = new Date();
    consultation.prescriptionPdfFilename = filenameEn;
    consultation.prescriptionPdfFilenameHi = filenameHi;
    consultation.prescriptionFailureMessage = undefined;
    if (consultation.status === 'responded') {
      consultation.status = 'completed';
    }
    await consultation.save();

    console.log('Prescription generated and stored for consultation:', consultation._id.toString());
  } catch (err) {
    console.error('Prescription generation failed for consultation:', consultation._id.toString(), err.message);
    consultation.prescriptionStatus = 'failed';
    consultation.prescriptionFailureMessage = String(err.message).slice(0, 500);
    try {
      await consultation.save();
    } catch (saveErr) {
      console.error('Failed to persist prescription failure state:', saveErr.message);
    }
  }
}

async function getPrescriptionFile(consultationId, requester, lang) {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new ApiError(404, 'Consultation not found');
  }

  const isOwner =
    requester.role === 'patient' && consultation.patientId.toString() === requester.user._id.toString();
  const isDoctor = requester.role === 'doctor';
  if (!isOwner && !isDoctor) {
    throw new ApiError(403, 'You do not have permission to access this prescription');
  }

  if (consultation.prescriptionStatus !== 'generated' || !consultation.prescriptionPdfFilename) {
    throw new ApiError(404, 'Prescription not available yet');
  }

  const wantsHindi = lang === 'hi' && consultation.prescriptionPdfFilenameHi;
  const filename = wantsHindi ? consultation.prescriptionPdfFilenameHi : consultation.prescriptionPdfFilename;

  const filePath = path.join(PRESCRIPTION_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Prescription file not found');
  }

  console.log('Prescription download for consultation:', consultation._id.toString(), 'by', requester.role, 'lang:', wantsHindi ? 'hi' : 'en');

  return { filePath, filename: `Healthify-Prescription-${consultationReferenceCode(consultation)}.pdf` };
}

module.exports = { generatePrescription, getPrescriptionFile, PRESCRIPTION_DIR };
