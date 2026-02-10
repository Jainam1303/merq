const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ReferralEarning = sequelize.define('ReferralEarning', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    referrer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'User who made the referral (earns commission)',
    },
    referred_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'User who was referred',
    },
    payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Payment that triggered this earning',
    },
    plan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    payment_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Original payment amount',
    },
    commission_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 5.00,
        comment: 'Commission percentage at time of earning',
    },
    commission_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Actual commission earned = payment_amount * rate / 100',
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'paid', 'rejected'),
        defaultValue: 'pending',
    },
    paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'referral_earnings',
    timestamps: true,
});

module.exports = ReferralEarning;
