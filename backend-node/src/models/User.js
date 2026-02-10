const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
}, {
    tableName: 'user', // LEGACY TABLE NAME IS SINGULAR
    timestamps: false,
});

module.exports = User;
