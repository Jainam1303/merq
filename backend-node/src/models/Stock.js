const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Stock = sequelize.define('Stock', {
    token: {
        type: DataTypes.STRING,
        allowNull: false
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    exchange: {
        type: DataTypes.STRING,
        defaultValue: 'NSE'
    }
}, {
    tableName: 'stocks',
    timestamps: false
});

module.exports = Stock;
