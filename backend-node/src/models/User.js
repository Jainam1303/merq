const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const crypto = require('crypto');

// Generate a random alphanumeric client ID like MQ-A7X9K2
function generateClientId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I,O,0,1
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(crypto.randomInt(chars.length));
    }
    return `MQ-${code}`;
}

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    client_id: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: true,
        comment: 'Unique alphanumeric client ID (e.g. MQ-A7X9K2)',
    },
    username: {
        type: DataTypes.STRING(150),
        unique: true,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: true, // Legacy allows null, but we try to fill it
    },
    password: { // Legacy Column Name
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    phone: DataTypes.STRING(20),

    // Admin & Status flags
    is_admin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },

    // Referral System
    referral_code: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: true,
        comment: 'Unique referral code, generated after first paid plan purchase',
    },
    referred_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'User ID of the person who referred this user',
    },
    referral_earnings_total: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        comment: 'Total commission earned from referrals',
    },

    // Broker Credentials (Encrypted)
    angel_api_key: DataTypes.TEXT,
    angel_client_code: DataTypes.STRING(100),
    angel_password: DataTypes.TEXT,
    angel_totp: DataTypes.TEXT,

    // Backtest Credentials
    backtest_api_key: DataTypes.TEXT,
    backtest_client_code: DataTypes.STRING(100),
    backtest_password: DataTypes.TEXT,
    backtest_totp: DataTypes.TEXT,

    // WhatsApp Alert Settings (per-user)
    whatsapp_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'WhatsApp phone number with country code (e.g. 919876543210)',
    },
    whatsapp_api_key: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'CallMeBot API key for WhatsApp alerts',
    },
}, {
    tableName: 'user', // LEGACY TABLE NAME IS SINGULAR
    timestamps: false,
    hooks: {
        beforeCreate: async (user) => {
            // Auto-generate client_id if not set
            if (!user.client_id) {
                let attempts = 0;
                while (attempts < 10) {
                    const candidateId = generateClientId();
                    const existing = await User.findOne({ where: { client_id: candidateId } });
                    if (!existing) {
                        user.client_id = candidateId;
                        break;
                    }
                    attempts++;
                }
                if (!user.client_id) {
                    // Fallback: use timestamp-based ID
                    user.client_id = `MQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
                }
            }
        }
    }
});

module.exports = User;

