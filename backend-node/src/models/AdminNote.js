const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AdminNote = sequelize.define('AdminNote', {
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
    admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user',
            key: 'id'
        }
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    tableName: 'admin_notes',
    timestamps: true,
    updatedAt: false,
});

module.exports = AdminNote;
