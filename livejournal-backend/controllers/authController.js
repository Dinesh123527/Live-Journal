require('dotenv').config();
const db = require('../db');
const bcrypt = require('bcrypt');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/token');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const REFRESH_DAYS = Number(process.env.REFRESH_EXPIRES_DAYS ?? 1);

function setRefreshCookie(res, token) {
  const maxAge = REFRESH_DAYS * 24 * 60 * 60 * 1000; // ms
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/api/auth/refresh',
  });
}

// REGISTER
async function register(req, res) {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (!name || !email || !password || !confirmPassword) return res.status(400).json({ error: 'Missing fields' });

    // Validate password match
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

    if (password.length < 8) return res.status(400).json({ error: 'Password must be >= 8 characters' });

    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const [result] = await db.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [
      name,
      email,
      password_hash,
    ]);
    const userId = result.insertId;

    // sign access token and get jti
    const { token: accessToken, jti: accessJti } = signAccessToken({ userId });
    const refreshToken = signRefreshToken({ userId, rid: crypto.randomUUID() });

    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
    // store refresh token along with associated access_jti
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, access_jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, refreshToken, accessJti, req.get('User-Agent') || null, req.ip || null, expiresAt]
    );

    setRefreshCookie(res, refreshToken);
    res.json({ token: accessToken, user: { id: userId, name, email } });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// LOGIN
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const [rows] = await db.query('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const { token: accessToken, jti: accessJti } = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id, rid: crypto.randomUUID() });

    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
    // store refresh token along with associated access_jti
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, access_jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, refreshToken, accessJti, req.get('User-Agent') || null, req.ip || null, expiresAt]
    );

    setRefreshCookie(res, refreshToken);
    res.json({ token: accessToken, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// REFRESH (rotates refresh token)
async function refresh(req, res) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (e) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    const [rows] = await db.query('SELECT id, expires_at FROM refresh_tokens WHERE token = ? AND user_id = ?', [
      token,
      payload.userId,
    ]);
    if (!rows.length) return res.status(403).json({ error: 'Refresh token not found' });

    const rt = rows[0];
    if (new Date(rt.expires_at) < new Date()) {
      await db.query('DELETE FROM refresh_tokens WHERE id = ?', [rt.id]);
      return res.status(403).json({ error: 'Refresh token expired' });
    }

    // rotate refresh token: issue new refresh token + access token, persist access_jti
    const { token: accessToken, jti: accessJti } = signAccessToken({ userId: payload.userId });
    const newRefreshToken = signRefreshToken({ userId: payload.userId, rid: crypto.randomUUID() });
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

    // delete old refresh token row and insert new one with access_jti
    await db.query('DELETE FROM refresh_tokens WHERE id = ?', [rt.id]);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, access_jti, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [payload.userId, newRefreshToken, accessJti, req.get('User-Agent') || null, req.ip || null, expiresAt]
    );

    setRefreshCookie(res, newRefreshToken);
    res.json({ token: accessToken });
  } catch (err) {
    console.error('refresh error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// LOGOUT (revoke access jti even when only cookie provided)
async function logout(req, res) {
  try {
    const rtoken = req.cookies?.refreshToken || null;
    const authHeader = req.headers['authorization'] || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // 1) If access token provided, revoke its jti
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        const jti = decoded.jti;
        const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : null;
        if (jti) {
          await db.query('INSERT IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)', [jti, expiresAt]);
        }
      } catch (e) {
      }
    }

    if (rtoken) {
      try {
        const [rows] = await db.query('SELECT id, access_jti FROM refresh_tokens WHERE token = ?', [rtoken]);
        if (rows.length) {
          const row = rows[0];
          if (row.access_jti) {
            await db.query('INSERT IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, NULL)', [row.access_jti]);
          }

          await db.query('DELETE FROM refresh_tokens WHERE id = ?', [row.id]);
        }
      } catch (e) {
        console.error('Error handling refresh token on logout', e);
      }
    }

    // clear cookie for client
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('logout error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ME (protected)
async function me(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await db.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    res.json({ user: rows[0] });
  } catch (err) {
    console.error('me error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// FORGOT PASSWORD
async function forgotPassword(req, res) {
  const { email } = req.body;

  // Always return same response for security (don't leak email existence)
  const genericResponse = {
    message: 'If an account with that email exists, a password reset link has been sent.'
  };

  try {
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const [users] = await db.query('SELECT id, email FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      // Don't reveal that email doesn't exist
      return res.json(genericResponse);
    }

    const user = users[0];

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before storing (security best practice)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token expires in 15 minutes
    const expiryMinutes = Number(process.env.RESET_TOKEN_EXPIRY_MINUTES) || 15;
    const expires = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save hashed token to database
    await db.query(
      `UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`,
      [hashedToken, expires, user.id]
    );

    // Create reset link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    // Send email
    const transporter = require('../utils/mailer');
    await transporter.sendMail({
      from: `"Live Journal" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🔐 Reset your Live Journal password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Live Journal</h1>
          </div>
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 16px; padding: 30px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #666; line-height: 1.6;">
              You requested to reset your password. Click the button below to create a new password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); 
                        color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; 
                        font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              This link will expire in <strong>${expiryMinutes} minutes</strong>.
            </p>
            <p style="color: #999; font-size: 14px;">
              If you didn't request this, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
            © ${new Date().getFullYear()} Live Journal. All rights reserved.
          </p>
        </div>
      `
    });

    console.log(`Password reset email sent to ${user.email}`);
    return res.json(genericResponse);
  } catch (err) {
    console.error('forgotPassword error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// RESET PASSWORD
async function resetPassword(req, res) {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  try {
    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Password and confirmation are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const [users] = await db.query(
      `SELECT id FROM users 
       WHERE reset_token = ? AND reset_token_expires > NOW()`,
      [hashedToken]
    );

    if (users.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }

    const userId = users[0].id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and invalidate token (one-time use)
    await db.query(
      `UPDATE users 
       SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL 
       WHERE id = ?`,
      [hashedPassword, userId]
    );

    // Also invalidate all existing refresh tokens for security
    await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);

    console.log(`Password reset successful for user ${userId}`);
    return res.json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (err) {
    console.error('resetPassword error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { register, login, refresh, logout, me, forgotPassword, resetPassword };