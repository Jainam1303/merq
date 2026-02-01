const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StrategyConfig = sequelize.define('StrategyConfig', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
    },
    display_name: DataTypes.STRING(200),
    description: DataTypes.TEXT,
    category: DataTypes.STRING(50),
    default_config: DataTypes.JSONB,
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'strategies',
    timestamps: true,
});

module.exports = StrategyConfig;
