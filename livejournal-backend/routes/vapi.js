const express = require('express');
const router = express.Router();
const validateAuth = require('../middleware/validateAuth');

// GET /api/vapi/config - Get Vapi configuration
router.get('/config', validateAuth, (req, res) => {
  try {
    const vapiConfig = {
      publicKey: process.env.VAPI_PUBLIC_KEY,
      assistantId: process.env.VAPI_ASSISTANT_ID,
    };

    // Validate that keys exist
    if (!vapiConfig.publicKey || !vapiConfig.assistantId) {
      return res.status(500).json({
        error: 'Vapi configuration not found',
        message: 'Voice journal feature is not configured on the server'
      });
    }

    res.json({
      success: true,
      data: vapiConfig
    });
  } catch (err) {
    console.error('Error fetching Vapi config:', err);
    res.status(500).json({
      error: 'Failed to fetch Vapi configuration',
      message: err.message
    });
  }
});

module.exports = router;

