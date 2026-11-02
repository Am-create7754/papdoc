const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: { createdAt: 'uploadedAt', updatedAt: false } }
);

const consultationSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },

    chiefComplaint: { type: String, required: true, trim: true, maxlength: 1000 },
    symptoms: { type: [String], required: true, validate: (v) => v.length > 0 },
    duration: { type: String, required: true, trim: true, maxlength: 100 },
    additionalNotes: { type: String, trim: true, maxlength: 2000 },

    medicalHistorySnapshot: { type: [String], default: [] },
    currentMedicationsSnapshot: { type: [String], default: [] },
    allergiesSnapshot: { type: [String], default: [] },

    consultationType: { type: String, enum: ['standard', 'priority', 'video'], default: 'standard' },
    attachments: { type: [attachmentSchema], default: [] },

    // Computed once at creation by consultationEligibilityService and never recomputed — this is
    // the authoritative record of whether Video was offered/allowed for this consultation's
    // content, checked again (cheaply, from this stored value) at order-creation time.
    videoEligible: { type: Boolean, default: true },
    videoEligibilityReasonCode: {
      type: String,
      enum: ['AGE_UNDER_10', 'RED_FLAG_PRESENT', 'LOW_ACUITY_NO_RED_FLAGS', 'UNCERTAIN'],
    },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'responded', 'completed', 'cancelled'],
      default: 'submitted',
    },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'],
      default: 'unpaid',
    },
    paymentAmount: { type: Number, min: 0 },
    paymentCurrency: { type: String, default: 'INR' },
    razorpayOrderId: { type: String, index: true, unique: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, unique: true, sparse: true },
    paidAt: { type: Date },

    whatsappMessageId: { type: String, index: true, unique: true, sparse: true },
    whatsappNotifiedAt: { type: Date },
    doctorWhatsappReplyMessageId: { type: String, index: true, unique: true, sparse: true },
    doctorReply: { type: String, trim: true, maxlength: 4000 },
    doctorRepliedAt: { type: Date },

    whatsappDeliveryStatus: { type: String, enum: ['sent', 'delivered', 'read', 'failed'] },
    whatsappDeliveredAt: { type: Date },
    whatsappReadAt: { type: Date },
    whatsappFailedAt: { type: Date },
    whatsappFailureCode: { type: String, trim: true },
    whatsappFailureMessage: { type: String, trim: true, maxlength: 500 },

    // Operational doctor alerts (🔵 video paid / 🔴 priority paid) — deliberately separate from
    // whatsappMessageId/doctorWhatsappReplyMessageId above. Those two fields are the sole
    // correlation key the prescription-reply flow uses; a doctor reply to one of these alerts
    // must never match that lookup. sentAt doubles as the idempotency guard (claimed atomically
    // before send) so a duplicate webhook/verify retry can't fire the same alert twice.
    videoAlertMessageId: { type: String, trim: true },
    videoAlertSentAt: { type: Date },
    priorityAlertMessageId: { type: String, trim: true },
    priorityAlertSentAt: { type: Date },

    prescriptionStatus: { type: String, enum: ['none', 'generated', 'failed'], default: 'none' },
    prescriptionGeneratedAt: { type: Date },
    prescriptionPdfFilename: { type: String, trim: true },
    prescriptionPdfFilenameHi: { type: String, trim: true },
    prescriptionFailureMessage: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Consultation', consultationSchema);
