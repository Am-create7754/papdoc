const { z } = require('zod');

const createConsultationSchema = z.object({
  chiefComplaint: z.string().trim().min(5, 'Please describe your main problem').max(1000),
  symptoms: z
    .string()
    .trim()
    .min(1, 'Please list at least one symptom')
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    )
    .refine((arr) => arr.length > 0, 'Please list at least one symptom'),
  duration: z.string().trim().min(1, 'Please specify how long this has been going on').max(100),
  additionalNotes: z.string().trim().max(2000).optional().or(z.literal('')),
  consultationType: z.enum(['standard', 'priority', 'video']),
});

module.exports = { createConsultationSchema };
