// routes/auth.js
const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser');
const { register, login, refresh, logout, me, forgotPassword, resetPassword } = require('../controllers/authController');
const authenticateToken = require('../middleware/validateAuth');

router.use(cookieParser());

router.post('/register', register);
router.post('/login', login);

router.post('/refresh', refresh);

router.post('/logout', logout);

router.get('/me', authenticateToken, me);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
