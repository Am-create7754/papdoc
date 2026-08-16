const { z } = require('zod');

const patientProfileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  location: z.string().trim().max(150).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.array(z.string().trim().max(150)).optional(),
  existingMedicalConditions: z.array(z.string().trim().max(150)).optional(),
  currentMedications: z.array(z.string().trim().max(150)).optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(100).optional(),
      phone: z.string().trim().max(20).optional(),
      relation: z.string().trim().max(50).optional(),
    })
    .optional(),
});

module.exports = { patientProfileUpdateSchema };
