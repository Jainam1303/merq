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
    // is_active removed as it does not exist in legacy schema (UserMixin handles it logically in Flask)

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
