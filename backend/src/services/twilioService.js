const crypto = require('crypto');
const twilio = require('twilio');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

const AccessToken = twilio.jwt.AccessToken;
const { VideoGrant } = AccessToken;

// Token TTL is intentionally short — the frontend requests a fresh one right before joining,
// never stores it beyond the call, and a leaked token stops mattering within minutes.
const TOKEN_TTL_SECONDS = 300;

function isConfigured() {
  return !!(env.twilioAccountSid && env.twilioApiKeySid && env.twilioApiKeySecret);
}

function assertConfigured() {
  if (!isConfigured()) {
    throw new ApiError(503, 'Video calling is not configured. Please contact support.');
  }
}

function client() {
  assertConfigured();
  return twilio(env.twilioApiKeySid, env.twilioApiKeySecret, { accountSid: env.twilioAccountSid });
}

// Never derived from user input — callers only ever pass an internal VideoSession _id.
function roomNameFor(videoSessionId) {
  return `healthify-video-${videoSessionId}`;
}

async function createRoom(roomName) {
  assertConfigured();
  try {
    const room = await client().video.v1.rooms.create({
      uniqueName: roomName,
      type: env.twilioVideoRoomType,
    });
    return { sid: room.sid, uniqueName: room.uniqueName };
  } catch (err) {
    // 53113: a room with this uniqueName already exists (e.g. retry after a partial failure).
    if (err.code === 53113) {
      const existing = await client().video.v1.rooms(roomName).fetch();
      return { sid: existing.sid, uniqueName: existing.uniqueName };
    }
    console.error('Twilio room creation failed:', err.message);
    throw new ApiError(502, 'Could not start the video room. Please try again.');
  }
}

async function completeRoom(roomSid) {
  if (!roomSid) return;
  try {
    await client().video.v1.rooms(roomSid).update({ status: 'completed' });
  } catch (err) {
    // Best-effort — the room times out on its own even if this call fails.
    console.warn('Twilio room completion failed:', err.message);
  }
}

function generateAccessToken({ identity, roomName }) {
  assertConfigured();
  const token = new AccessToken(env.twilioAccountSid, env.twilioApiKeySid, env.twilioApiKeySecret, {
    identity,
    ttl: TOKEN_TTL_SECONDS,
    jti: `${identity}-${crypto.randomBytes(8).toString('hex')}`,
  });
  token.addGrant(new VideoGrant({ room: roomName }));
  return token.toJwt();
}

module.exports = { isConfigured, roomNameFor, createRoom, completeRoom, generateAccessToken };
