const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StockSentiment = sequelize.define('StockSentiment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    score: {
        type: DataTypes.FLOAT, // from -1 (bearish) to 1 (bullish)
        allowNull: false,
        defaultValue: 0.0
    },
    bullish_mentions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    bearish_mentions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    last_updated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'stock_sentiments',
    timestamps: false
});

module.exports = StockSentiment;
