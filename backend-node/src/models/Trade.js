const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Trade = sequelize.define('Trade', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user',  // LEGACY TABLE NAME IS SINGULAR
            key: 'id'
        }
    },
    symbol: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    mode: {
        type: DataTypes.STRING(10), // BUY or SELL
        allowNull: false,
        defaultValue: 'BUY'
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    entry_price: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: 0
    },
    exit_price: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: true,
        defaultValue: 0
    },
    sl: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: true
    },
    tp: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: true
    },
    pnl: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: 0
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'COMPLETED' // OPEN, COMPLETED, CANCELLED
    },
    timestamp: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    is_simulated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    entry_order_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    exit_order_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    strategy: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'trades',
    timestamps: true, // Adds createdAt and updatedAt
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['symbol']
        },
        {
            fields: ['status']
        },
        {
            fields: ['timestamp']
        }
    ]
});

module.exports = Trade;
