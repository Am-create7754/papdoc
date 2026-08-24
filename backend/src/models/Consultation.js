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

    prescriptionStatus: { type: String, enum: ['none', 'generated', 'failed'], default: 'none' },
    prescriptionGeneratedAt: { type: Date },
    prescriptionPdfFilename: { type: String, trim: true },
    prescriptionPdfFilenameHi: { type: String, trim: true },
    prescriptionFailureMessage: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Consultation', consultationSchema);
