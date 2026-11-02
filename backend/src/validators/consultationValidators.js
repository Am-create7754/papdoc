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

const manualReplySchema = z.object({
  reply: z.string().trim().min(5, 'Please write a response of at least 5 characters').max(4000),
});

// Deliberately lenient (all optional) — this backs the wizard's incremental pre-checks, which
// may run with only the chief complaint filled in and symptoms/duration not yet reached.
const precheckInputSchema = z.object({
  chiefComplaint: z.string().trim().max(1000).optional().or(z.literal('')),
  symptoms: z.string().trim().max(500).optional().or(z.literal('')),
  duration: z.string().trim().max(100).optional().or(z.literal('')),
  additionalNotes: z.string().trim().max(2000).optional().or(z.literal('')),
});

module.exports = { createConsultationSchema, manualReplySchema, precheckInputSchema };
