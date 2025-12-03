const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const aiCtrl = require('../controllers/aiController');

router.use(authenticateToken);

router.post('/rewrite', aiCtrl.rewrite);             
router.post('/title', aiCtrl.titleSuggestions);      
router.post('/tags', aiCtrl.tagsSuggestions);         
router.post('/advice', aiCtrl.advice);                
router.get('/habits', aiCtrl.habitDetect);
router.get('/welcome-greeting', aiCtrl.welcomeGreeting);

module.exports = router;
