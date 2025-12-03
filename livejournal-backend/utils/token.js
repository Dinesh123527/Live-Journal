require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_DAYS = Number(process.env.REFRESH_EXPIRES_DAYS || 1);

function signAccessToken(payload) {
  const jti = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES, jwtid: jti });
  return { token, jti };
}

function signRefreshToken(payload) {
  const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: `${REFRESH_DAYS}d`,
  });
  return token;
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};