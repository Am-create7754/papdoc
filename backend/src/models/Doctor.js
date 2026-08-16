const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['doctor'], default: 'doctor' },

    profilePhoto: { type: String, trim: true },
    specialization: { type: String, trim: true },
    qualifications: { type: [String], default: [] },
    medicalRegistrationNumber: { type: String, trim: true },
    yearsOfExperience: { type: Number, min: 0 },
    areasOfExpertise: { type: [String], default: [] },
    commonlyTreatedConditions: { type: [String], default: [] },
    clinicName: { type: String, trim: true },
    clinicAddress: { type: String, trim: true },
    city: { type: String, trim: true },
    languages: { type: [String], default: [] },
    professionalAchievements: { type: [String], default: [] },
    bio: { type: String, trim: true, maxlength: 2000 },
    consultationFee: { type: Number, min: 0 },
    priorityConsultationFee: { type: Number, min: 0 },
    videoConsultationFee: { type: Number, min: 0 },
    videoConsultationEnabled: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);
