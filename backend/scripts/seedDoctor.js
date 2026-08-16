require('dotenv').config();

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { validateEnv, env } = require('../src/config/env');
const Doctor = require('../src/models/Doctor');

const SALT_ROUNDS = 12;

async function run() {
  validateEnv();

  const fullName = process.env.DOCTOR_NAME;
  const email = process.env.DOCTOR_EMAIL;
  const password = process.env.DOCTOR_PASSWORD;

  if (!fullName || !email || !password) {
    console.error(
      'Usage: set DOCTOR_NAME, DOCTOR_EMAIL, DOCTOR_PASSWORD env vars before running this script.'
    );
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);

  const existing = await Doctor.findOne();
  if (existing) {
    console.error('A doctor account already exists. Only one doctor is allowed.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await Doctor.create({ fullName, email: email.toLowerCase(), passwordHash });

  console.log(`Doctor account created for ${email}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to seed doctor:', err.message);
  process.exit(1);
});
