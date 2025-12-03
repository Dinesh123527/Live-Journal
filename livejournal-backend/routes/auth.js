// routes/auth.js
const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser');
const { register, login, refresh, logout, me } = require('../controllers/authController');
const authenticateToken = require('../middleware/validateAuth');

router.use(cookieParser());

router.post('/register', register);
router.post('/login', login);

router.post('/refresh', refresh);

router.post('/logout', logout);

router.get('/me', authenticateToken, me);

module.exports = router;
