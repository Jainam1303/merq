const crypto = require('crypto');
const axios = require('axios');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5002';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'shared_secret_key_must_match_python';

class PythonEngineService {

    constructor() {
        this.client = axios.create({
            baseURL: PYTHON_SERVICE_URL,
            timeout: 60000 // 60s timeout for heavy backtests
        });
    }

    // Generate HMAC Signature
    _getHeaders(body = {}) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const payload = JSON.stringify(body) + timestamp;
        const signature = crypto.createHmac('sha256', INTERNAL_SECRET).update(payload).digest('hex');

        return {
            'Content-Type': 'application/json',
            'X-Service-ID': 'merq-node-core',
            'X-Timestamp': timestamp,
            'X-Internal-Sig': signature
        };
    }

    // 1. Start Engine
    async startSession(userId, strategyConfig, brokerCreds) {
        const payload = {
            user_id: userId,
            strategy_config: strategyConfig,
            broker_credentials: brokerCreds
        };

        try {
            const res = await this.client.post('/engine/start', payload, {
                headers: this._getHeaders(payload)
            });
            return res.data;
        } catch (err) {
            console.error('Engine Start Failed:', err.message);
            throw new Error('Failed to start trading engine');
        }
    }

    // 2. Stop Engine
    async stopSession(userId) {
        const payload = { user_id: userId };
        try {
            const res = await this.client.post('/engine/stop', payload, {
                headers: this._getHeaders(payload)
            });
            return res.data;
        } catch (err) {
            console.error('Engine Stop Failed:', err.message);
            return { status: 'failed_or_already_stopped' };
        }
    }

    // 3. Get Status
    async getStatus(userId) {
        try {
            // GET requests sign an empty body usually, or just timestamp
            // For simplicity in this v1, we assume GETs are protected by IP whitelist + simple token, 
            // but let's stick to HMAC if we can pass it in headers.
            const headers = this._getHeaders({});
            const res = await this.client.get(`/engine/status/${userId}`, { headers });
            return res.data;
        } catch (err) {
            // Return offline status if unreachable
            return { active: false, status: 'offline', error: err.message };
        }
    }
    // 4. Run Backtest
    async runBacktest(payload) {
        try {
            const res = await this.client.post('/backtest', payload, {
                headers: this._getHeaders(payload)
            });
            return res.data;
        } catch (err) {
            console.error('Backtest Failed:', err.message);
            if (err.code === 'ECONNREFUSED') {
                throw new Error('Python Engine Offline (Port 5001). Please check if engine is running.');
            }
            throw new Error(err.response?.data?.detail || err.message || 'Backtest failed');
        }
    }
}

module.exports = new PythonEngineService();
