// Starts the whole local stack with one command: backend (5000), frontend (5173) and the ngrok
// tunnel that gives phones and Meta's WhatsApp webhook a public HTTPS URL. Ctrl+C stops all three.
//
//   npm run dev              -> backend + frontend + tunnel
//   npm run dev -- --no-tunnel   (or npm run dev:local)  -> backend + frontend only
//
// The tunnel domain comes from NGROK_DOMAIN, defaulting to this project's free static domain.
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || 'navy-studio-custodian.ngrok-free.dev';
const withTunnel = !process.argv.includes('--no-tunnel');

const COLORS = { backend: '\x1b[36m', frontend: '\x1b[35m', ngrok: '\x1b[33m' };
const RESET = '\x1b[0m';

const children = [];
let shuttingDown = false;
let ngrokOutput = '';

function prefixLines(name, chunk, stream) {
  const label = `${COLORS[name]}[${name}]${RESET} `;
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line.trim()) stream.write(label + line + '\n');
  }
}

function start(name, command, args) {
  const child = spawn(command, args, { cwd: ROOT, shell: process.platform === 'win32', env: process.env });
  const capture = (chunk) => {
    if (name === 'ngrok') ngrokOutput += chunk.toString();
  };
  child.stdout.on('data', (chunk) => {
    capture(chunk);
    prefixLines(name, chunk, process.stdout);
  });
  child.stderr.on('data', (chunk) => {
    capture(chunk);
    prefixLines(name, chunk, process.stderr);
  });
  child.on('error', (err) => {
    prefixLines(name, `could not start: ${err.message}`, process.stderr);
  });
  child.on('exit', (code) => {
    if (shuttingDown) return;
    if (name === 'ngrok' && ngrokOutput.includes('ERR_NGROK_334')) {
      // The domain is already being served by another ngrok (e.g. one started in a terminal) —
      // that tunnel keeps working, so there is nothing to fix.
      prefixLines(
        'ngrok',
        `Tunnel already running elsewhere — https://${NGROK_DOMAIN} keeps working through it.`,
        process.stdout
      );
      return;
    }
    prefixLines(name, `exited with code ${code}`, process.stderr);
    if (name === 'ngrok') {
      prefixLines(
        'ngrok',
        'Tunnel is down — the app still runs on http://localhost:5173, but phones and WhatsApp replies cannot reach it.',
        process.stderr
      );
    }
  });
  children.push(child);
  return child;
}

function stopAll() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\nStopping backend, frontend and tunnel…');
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      // npm/ngrok run under a shell on Windows; kill the whole process tree.
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGINT');
    }
  }
  setTimeout(() => process.exit(0), 1500);
}

process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

start('backend', 'npm', ['--prefix', 'backend', 'run', 'dev']);
start('frontend', 'npm', ['--prefix', 'frontend', 'run', 'dev']);

if (withTunnel) {
  // --log=stdout keeps errors (e.g. "domain already in use", missing authtoken) visible here.
  start('ngrok', 'ngrok', ['http', `--url=${NGROK_DOMAIN}`, '5173', '--log=stdout', '--log-level=warn']);
  console.log(`\n  Local:   http://localhost:5173\n  Public:  https://${NGROK_DOMAIN}\n  Webhook: https://${NGROK_DOMAIN}/api/webhooks/whatsapp\n`);
} else {
  console.log('\n  Local:   http://localhost:5173   (no tunnel)\n');
}
