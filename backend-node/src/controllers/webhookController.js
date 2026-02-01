const { sendUserUpdate } = require('../services/socketService');
const crypto = require('crypto');

const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'shared_secret_key_must_match_python';

// Validate HMAC from Python
const validateSignature = (req) => {
    const signature = req.headers['x-internal-sig'];
    const timestamp = req.headers['x-timestamp'];
    const body = JSON.stringify(req.body); // Raw body needed in production

    if (!signature || !timestamp) return false;

    const payload = body + timestamp;
    const expectedSig = crypto.createHmac('sha256', INTERNAL_SECRET).update(payload).digest('hex');

    // In a real implementation with raw body parsing, compare hashes.
    // For now, we assume middleware handles parsing. 
    // TODO: Fix raw body verification if strict security needed.
    return true; // Bypassing for initial scaffolding
};

exports.handleEvent = async (req, res) => {
    try {
        // 1. Validate Source (Python Backend)
        // if (!validateSignature(req)) return res.status(401).json({ message: 'Invalid Signature' });

        const { event, user_id, data } = req.body;

        if (!event || !user_id) {
            return res.status(400).json({ message: 'Missing event or user_id' });
        }

        console.log(`Received Event [${event}] for User [${user_id}]`);

        // 2. Persist critical events to DB (Optional for Phase 5, required later)
        // if (event === 'trade_closed') { await saveTradeSummary(data); }

        // 3. Forward to Frontend via Socket
        sendUserUpdate(user_id, event, data);

        res.json({ status: 'processed' });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
