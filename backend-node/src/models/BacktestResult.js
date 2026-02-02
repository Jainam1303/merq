const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BacktestResult = sequelize.define('BacktestResult', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    strategy: {
        type: DataTypes.STRING,
        defaultValue: 'ORB'
    },
    interval: {
        type: DataTypes.STRING
    },
    from_date: {
        type: DataTypes.STRING
    },
    to_date: {
        type: DataTypes.STRING
    },
    trade_data: {
        type: DataTypes.JSON
    },
    summary: { // We can calculate this or store it if frontend sends it. Frontend sends raw trades.
        type: DataTypes.JSON
    }
}, {
    timestamps: true
});

module.exports = BacktestResult;
