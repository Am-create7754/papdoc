const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

// Daily (daily.co) video provider. Rooms are PRIVATE: nobody can enter without a meeting token,
// and tokens are only ever issued by videoService.issueToken after an ownership check.
const DAILY_API = 'https://api.daily.co/v1';
const TIMEOUT_MS = 10000;

// A room lives for at most this long, after which Daily ejects everyone — a safety net in case
// the doctor never presses "End session". Comfortably longer than any single consultation.
const ROOM_MAX_MINUTES = 120;

// Tokens only need to be valid at the moment of joining (Daily doesn't eject on token expiry
// unless asked to), so keep them short-lived; the frontend fetches a fresh one if it lingers.
const TOKEN_TTL_SECONDS = 15 * 60;

function isConfigured() {
  return !!env.dailyApiKey;
}

function assertConfigured() {
  if (!isConfigured()) {
    throw new ApiError(503, 'Video calling is not configured. Please contact support.');
  }
}

async function dailyRequest(method, path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${DAILY_API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${env.dailyApiKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.info || data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.dailyError = data?.error;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Daily request timed out');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// Never derived from user input — callers only ever pass an internal VideoSession _id.
function roomNameFor(videoSessionId) {
  return `healthify-video-${videoSessionId}`;
}

async function createRoom(roomName) {
  assertConfigured();
  const nowSeconds = Math.floor(Date.now() / 1000);
  try {
    const room = await dailyRequest('POST', '/rooms', {
      name: roomName,
      privacy: 'private',
      properties: {
        exp: nowSeconds + ROOM_MAX_MINUTES * 60,
        eject_at_room_exp: true,
        max_participants: 2,
        enable_chat: false,
        enable_screenshare: false,
        enable_prejoin_ui: false,
      },
    });
    return { sid: room.id, uniqueName: room.name, url: room.url };
  } catch (err) {
    // The room already exists (e.g. retry after a partial failure) — reuse it.
    if (err.status === 400 && /already exists/i.test(err.message)) {
      const existing = await dailyRequest('GET', `/rooms/${encodeURIComponent(roomName)}`);
      return { sid: existing.id, uniqueName: existing.name, url: existing.url };
    }
    console.error('Daily room creation failed:', err.message);
    throw new ApiError(502, 'Could not start the video room. Please try again.');
  }
}

// Deleting the room ends the call for anyone still in it and frees it immediately.
async function completeRoom(roomName) {
  if (!roomName || !isConfigured()) return;
  try {
    await dailyRequest('DELETE', `/rooms/${encodeURIComponent(roomName)}`);
  } catch (err) {
    // Best-effort — the room expires on its own (ROOM_MAX_MINUTES) even if this call fails.
    console.warn('Daily room deletion failed:', err.message);
  }
}

async function generateAccessToken({ identity, roomName, userName, isOwner = false }) {
  assertConfigured();
  try {
    const { token } = await dailyRequest('POST', '/meeting-tokens', {
      properties: {
        room_name: roomName,
        user_id: identity,
        user_name: userName || identity,
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
      },
    });
    return token;
  } catch (err) {
    console.error('Daily token creation failed:', err.message);
    throw new ApiError(502, 'Could not prepare the video call. Please try again.');
  }
}

module.exports = { isConfigured, roomNameFor, createRoom, completeRoom, generateAccessToken };
