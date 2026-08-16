const crypto = require('crypto');

function verifyHmacSignature(payload, signature, secret) {
  if (!signature || typeof signature !== 'string') return false;

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const givenBuf = Buffer.from(signature, 'hex');

  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}

module.exports = { verifyHmacSignature };
