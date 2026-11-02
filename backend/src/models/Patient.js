const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Google sign-ins have no phone or password, so both are only required for email signups.
    phone: {
      type: String,
      trim: true,
      required() {
        return !this.googleId;
      },
    },
    passwordHash: {
      type: String,
      select: false,
      required() {
        return !this.googleId;
      },
    },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['patient'], default: 'patient' },

    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    location: { type: String, trim: true },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    allergies: { type: [String], default: [] },
    existingMedicalConditions: { type: [String], default: [] },
    currentMedications: { type: [String], default: [] },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relation: { type: String, trim: true },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', patientSchema);
