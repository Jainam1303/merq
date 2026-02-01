const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Plan = sequelize.define('Plan', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
    },
    display_name: DataTypes.STRING(100),
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    duration_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    features: DataTypes.JSONB,
    limits: DataTypes.JSONB,
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'plans',
    timestamps: true,
});

module.exports = Plan;
