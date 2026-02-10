const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user',
            key: 'id'
        }
    },
    action: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    target_type: {
        type: DataTypes.STRING(50),
        allowNull: true, // 'user', 'plan', 'system', 'announcement'
    },
    target_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    details: {
        type: DataTypes.TEXT, // JSON string with extra context
        allowNull: true,
    },
    ip_address: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
}, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false, // Audit logs are write-only
});

module.exports = AuditLog;
