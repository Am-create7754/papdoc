// Builds the production env file for the server from your local backend/.env and frontend/.env,
// so secrets are never typed twice and never committed. Run locally:
//
//   node deploy/make-env.js <public-hostname>
//
// Writes it OUTSIDE the project (your home folder) — copy it to the server as /etc/healthify/env.
const fs = require('fs');
const os = require('os');
const path = require('path');

const host = process.argv[2];
if (!host) {
  console.error('usage: node deploy/make-env.js <public-hostname>   (e.g. 140-238-1-2.sslip.io)');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const backend = parseEnv(path.join(ROOT, 'backend', '.env'));
const frontend = parseEnv(path.join(ROOT, 'frontend', '.env'));

if (!backend.ATLAS_MONGO_URI) {
  console.error('backend/.env has no ATLAS_MONGO_URI — production needs the Atlas database.');
  process.exit(1);
}

// Local-only or retired settings that must not reach production.
const DROP = new Set(['ATLAS_MONGO_URI', 'MONGO_URI', 'PORT', 'NODE_ENV', 'TRUST_PROXY', 'UPLOADS_DIR', 'CLIENT_ORIGIN', 'APP_PUBLIC_URL']);
const env = {};
for (const [k, v] of Object.entries(backend)) {
  if (DROP.has(k) || k.startsWith('TWILIO_')) continue;
  env[k] = v;
}

Object.assign(env, {
  NODE_ENV: 'production',
  PORT: '5000',
  TRUST_PROXY: '1',
  MONGO_URI: backend.ATLAS_MONGO_URI,
  UPLOADS_DIR: '/var/lib/healthify/uploads',
  CLIENT_ORIGIN: `https://${host}`,
  APP_PUBLIC_URL: `https://${host}`,
  // Frontend build-time values (same origin, so the API is just /api).
  VITE_API_URL: '/api',
  VITE_GOOGLE_CLIENT_ID: frontend.VITE_GOOGLE_CLIENT_ID || backend.GOOGLE_CLIENT_ID || '',
  VITE_VIDEO_CONSULTATIONS: frontend.VITE_VIDEO_CONSULTATIONS || 'false',
});

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'DAILY_API_KEY'];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  console.error('Missing required values:', missing.join(', '));
  process.exit(1);
}

const outFile = path.join(os.homedir(), 'healthify-production.env');
const body =
  `# Healthify production env for https://${host} — generated ${new Date().toISOString()}\n` +
  Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') +
  '\n';
fs.writeFileSync(outFile, body, { mode: 0o600 });
console.log(`Wrote ${Object.keys(env).length} settings to ${outFile}`);
console.log('Keys:', Object.keys(env).join(', '));
