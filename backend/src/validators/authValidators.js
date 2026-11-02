const { z } = require('zod');

const patientRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(7).max(20),
  password: z.string().min(8).max(72),
});

const patientLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const patientGoogleLoginSchema = z.object({
  credential: z.string().min(1),
});

const doctorLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

module.exports = {
  patientRegisterSchema,
  patientLoginSchema,
  patientGoogleLoginSchema,
  doctorLoginSchema,
  refreshSchema,
};
