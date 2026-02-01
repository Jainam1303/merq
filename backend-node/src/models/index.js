const { sequelize } = require('../config/db');
const User = require('./User');
const Plan = require('./Plan');
const Subscription = require('./Subscription');
const StrategyConfig = require('./StrategyConfig');

// User <-> Subscription
User.hasOne(Subscription, { foreignKey: 'user_id' });
Subscription.belongsTo(User, { foreignKey: 'user_id' });

// Plan <-> Subscription
Plan.hasMany(Subscription, { foreignKey: 'plan_id' });
Subscription.belongsTo(Plan, { foreignKey: 'plan_id' });

module.exports = {
    sequelize,
    User,
    Plan,
    Subscription,
    StrategyConfig,
};
