const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StarPerformer = sequelize.define('StarPerformer', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false
    },
    exchange: {
        type: DataTypes.STRING,
        defaultValue: 'NSE'
    },
    token: {
        type: DataTypes.STRING,
        allowNull: true
    },
    strategy: {
        type: DataTypes.STRING,
        defaultValue: 'orb'
    },
    strategy_label: {
        type: DataTypes.STRING,
        defaultValue: 'MerQ Alpha I'
    },
    timeframe: {
        type: DataTypes.STRING, // '7d', '30d', '90d', '120d'
        allowNull: false
    },
    // Metrics
    total_return_pct: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    total_return_inr: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    starting_capital: {
        type: DataTypes.FLOAT,
        defaultValue: 100000
    },
    ending_capital: {
        type: DataTypes.FLOAT,
        defaultValue: 100000
    },
    total_trades: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    winning_trades: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    losing_trades: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    win_rate: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    max_drawdown_pct: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    // Equity Curve - array of {date, equity} points
    equity_curve: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    // Deploy config - pre-filled settings for one-click deploy
    deploy_config: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    // Raw trade list for detail view
    trades: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    // Period dates
    from_date: {
        type: DataTypes.STRING
    },
    to_date: {
        type: DataTypes.STRING
    },
    // Last computed timestamp
    last_computed: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['symbol', 'strategy', 'timeframe']
        }
    ]
});

module.exports = StarPerformer;
