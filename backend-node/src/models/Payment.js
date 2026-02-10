const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user',
            key: 'id'
        }
    },
    plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'plans',
            key: 'id'
        }
    },
    razorpay_order_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    razorpay_payment_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    currency: {
        type: DataTypes.STRING(10),
        defaultValue: 'INR',
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending', // pending, success, failed
    },
}, {
    tableName: 'payments',
    timestamps: true,
});

module.exports = Payment;
