const { sequelize } = require('../config/db');
const User = require('./User');
const Plan = require('./Plan');
const Subscription = require('./Subscription');
const StrategyConfig = require('./StrategyConfig');
const Stock = require('./Stock');
const Trade = require('./Trade');
const BacktestResult = require('./BacktestResult');
const Payment = require('./Payment');
const AuditLog = require('./AuditLog');
const Announcement = require('./Announcement');
const AdminNote = require('./AdminNote');
const ReferralEarning = require('./ReferralEarning');
const StarPerformer = require('./StarPerformer');

// User <-> Subscription
User.hasMany(Subscription, { foreignKey: 'user_id' });
Subscription.belongsTo(User, { foreignKey: 'user_id' });

// Plan <-> Subscription
Plan.hasMany(Subscription, { foreignKey: 'plan_id' });
Subscription.belongsTo(Plan, { foreignKey: 'plan_id' });

// User <-> BacktestResult
User.hasMany(BacktestResult, { foreignKey: 'user_id' });
BacktestResult.belongsTo(User, { foreignKey: 'user_id' });

// User <-> Trade
User.hasMany(Trade, { foreignKey: 'user_id' });
Trade.belongsTo(User, { foreignKey: 'user_id' });

// User <-> Payment
User.hasMany(Payment, { foreignKey: 'user_id' });
Payment.belongsTo(User, { foreignKey: 'user_id' });

// Plan <-> Payment
Plan.hasMany(Payment, { foreignKey: 'plan_id' });
Payment.belongsTo(Plan, { foreignKey: 'plan_id' });

// User <-> AuditLog (admin who performed action)
User.hasMany(AuditLog, { foreignKey: 'admin_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

// User <-> Announcement (created by)
User.hasMany(Announcement, { foreignKey: 'created_by', as: 'announcements' });
Announcement.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// User <-> AdminNote
User.hasMany(AdminNote, { foreignKey: 'user_id', as: 'adminNotes' });
AdminNote.belongsTo(User, { foreignKey: 'user_id', as: 'targetUser' });
AdminNote.belongsTo(User, { foreignKey: 'admin_id', as: 'author' });

// User <-> ReferralEarning (as referrer)
User.hasMany(ReferralEarning, { foreignKey: 'referrer_id', as: 'referralEarnings' });
ReferralEarning.belongsTo(User, { foreignKey: 'referrer_id', as: 'referrer' });

// User <-> ReferralEarning (as referred)
ReferralEarning.belongsTo(User, { foreignKey: 'referred_id', as: 'referred' });

// User self-referential: referred_by
User.belongsTo(User, { foreignKey: 'referred_by', as: 'referredByUser' });
User.hasMany(User, { foreignKey: 'referred_by', as: 'referrals' });

// ReferralEarning <-> Payment
ReferralEarning.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });

module.exports = {
    sequelize,
    User,
    Plan,
    Subscription,
    StrategyConfig,
    Stock,
    Trade,
    BacktestResult,
    Payment,
    AuditLog,
    Announcement,
    AdminNote,
    ReferralEarning,
    StarPerformer
};
