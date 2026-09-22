const db = require('../config/database');

/**
 * Middleware untuk verifikasi API Key khusus AI / Automation Agent.
 * Header yang didukung:
 * 1. x-api-key: <API_KEY>
 * 2. Authorization: Bearer <API_KEY>
 */
function verifyAiApiKey(req, res, next) {
  const configuredApiKey = process.env.AI_API_KEY || 'sk_ai_elearning_secret_2026';
  
  const headerApiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  
  let incomingKey = headerApiKey;
  if (!incomingKey && authHeader && authHeader.startsWith('Bearer ')) {
    incomingKey = authHeader.substring(7).trim();
  }

  if (!incomingKey || incomingKey !== configuredApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API Key tidak valid atau belum disertakan. Gunakan header "x-api-key: <YOUR_API_KEY>" atau "Authorization: Bearer <YOUR_API_KEY>".',
      schema_docs: `${process.env.BASE_URL || 'http://localhost:9993'}/api/v1/schema`
    });
  }

  next();
}

module.exports = {
  verifyAiApiKey
};
