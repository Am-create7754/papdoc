const mongoose = require('mongoose');

// Statuses that occupy the single doctor's one active call slot. A patient session sits in
// this set from the moment it's invited until it's done — the partial unique index below is
// what actually enforces "only one active video session at a time" at the database level.
const OCCUPYING_STATUSES = ['ready', 'active'];

const videoSessionSchema = new mongoose.Schema(
  {
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
      unique: true,
    },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },

    status: {
      type: String,
      enum: ['queued', 'ready', 'active', 'completed', 'cancelled', 'expired', 'no_show', 'failed'],
      default: 'queued',
      index: true,
    },

    dayKey: { type: String, required: true, index: true }, // YYYY-MM-DD, the calendar day this slot counts against

    requestedAt: { type: Date, required: true },
    queuedAt: { type: Date, required: true },
    readyAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    cancelledAt: { type: Date },
    expiresAt: { type: Date }, // patient-join deadline while status === 'ready'

    doctorJoinedAt: { type: Date },
    patientJoinedAt: { type: Date },
    doctorLeftAt: { type: Date },
    patientLeftAt: { type: Date },

    twilioRoomSid: { type: String, trim: true },
    twilioRoomName: { type: String, trim: true, unique: true, sparse: true },

    estimatedWaitMinutes: { type: Number, min: 0 },

    noShowReason: { type: String, trim: true, maxlength: 300 },
    failureReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

// General doctor-scoped lookups (queue listing, dashboard queries).
videoSessionSchema.index({ doctorId: 1, status: 1 });

// The single most important invariant in this feature: at most one VideoSession per doctor
// may be in an occupying status at any time. Enforced atomically by MongoDB itself (not by
// application-level locking), so it holds even under concurrent promotion attempts. A
// different key pattern from the index above ({doctorId:1} vs {doctorId:1,status:1}) — Mongo
// does not allow two indexes sharing the same key pattern.
videoSessionSchema.index(
  { doctorId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: OCCUPYING_STATUSES } } }
);

videoSessionSchema.statics.OCCUPYING_STATUSES = OCCUPYING_STATUSES;

module.exports = mongoose.model('VideoSession', videoSessionSchema);
