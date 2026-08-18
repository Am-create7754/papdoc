const { z } = require('zod');

const doctorProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  profilePhoto: z.string().trim().url().max(500).optional(),
  signatureImage: z.string().trim().url().max(500).optional(),
  specialization: z.string().trim().max(150).optional(),
  qualifications: z.array(z.string().trim().max(150)).optional(),
  medicalRegistrationNumber: z.string().trim().max(100).optional(),
  yearsOfExperience: z.number().min(0).max(80).optional(),
  areasOfExpertise: z.array(z.string().trim().max(150)).optional(),
  commonlyTreatedConditions: z.array(z.string().trim().max(150)).optional(),
  clinicName: z.string().trim().max(200).optional(),
  clinicAddress: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  languages: z.array(z.string().trim().max(50)).optional(),
  professionalAchievements: z.array(z.string().trim().max(300)).optional(),
  bio: z.string().trim().max(2000).optional(),
  consultationFee: z.number().min(0).optional(),
  priorityConsultationFee: z.number().min(0).optional(),
  videoConsultationFee: z.number().min(0).optional(),
  videoConsultationEnabled: z.boolean().optional(),
});

module.exports = { doctorProfileUpdateSchema };
