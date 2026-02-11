const { User, Plan, Subscription, Trade, Payment, AuditLog, Announcement, AdminNote } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const bcrypt = require('bcryptjs');

// ============================================
// HELPER: Log admin actions
// ============================================
const logAction = async (adminId, action, targetType, targetId, details, ip) => {
    try {
        await AuditLog.create({
            admin_id: adminId,
            action,
            target_type: targetType,
            target_id: targetId,
            details: typeof details === 'string' ? details : JSON.stringify(details),
            ip_address: ip || 'unknown'
        });
    } catch (e) {
        console.error('Audit log error:', e.message);
    }
};

// ============================================
// DASHBOARD
// ============================================
// ============================================
// DASHBOARD
// ============================================
exports.getDashboard = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const activeUsers = await User.count({ where: { is_active: true } });
        const adminCount = await User.count({ where: { is_admin: true } });

        // Active subscriptions (PAID ONLY)
        const activeSubscriptions = await Subscription.count({
            where: { status: 'active' },
            include: [{
                model: Plan,
                where: { price: { [Op.gt]: 0 } } // Exclude Free Plans (Price > 0)
            }]
        });

        // Today's date range (Start of day to End of day)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Today's trades (ALL Users)
        const todayTrades = await Trade.count({
            where: {
                createdAt: { [Op.gte]: startOfDay, [Op.lte]: endOfDay } // Use entire day range
            }
        });

        // Today's P&L (ALL Users)
        const todayPnlResult = await Trade.findOne({
            attributes: [[fn('COALESCE', fn('SUM', col('pnl')), 0), 'total_pnl']],
            where: {
                createdAt: { [Op.gte]: startOfDay, [Op.lte]: endOfDay }
            },
            raw: true
        });

        // Revenue this month
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        let monthlyRevenue = 0;
        try {
            const revenueResult = await Payment.findOne({
                attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
                where: {
                    status: 'success',
                    createdAt: { [Op.gte]: monthStart }
                },
                raw: true
            });
            monthlyRevenue = parseFloat(revenueResult?.total) || 0;
        } catch (e) { /* Payment table might not exist yet */ }

        // New users this week
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        let newUsersWeek = 0;
        try {
            // Try createdAt if available, otherwise count all
            newUsersWeek = await User.count({
                where: { createdAt: { [Op.gte]: weekStart } } // Changed to createdAt for reliability
            });
        } catch (e) { }

        // Recent activity (last 20 audit log entries)
        let recentActivity = [];
        try {
            recentActivity = await AuditLog.findAll({
                include: [{ model: User, as: 'admin', attributes: ['username'] }],
                order: [['createdAt', 'DESC']],
                limit: 20,
                raw: true,
                nest: true
            });
        } catch (e) { }

        res.json({
            stats: {
                total_users: totalUsers,
                active_users: activeUsers,
                admin_count: adminCount,
                active_subscriptions: activeSubscriptions,
                today_trades: todayTrades,
                today_pnl: parseFloat(todayPnlResult?.total_pnl) || 0,
                monthly_revenue: monthlyRevenue,
                new_users_week: newUsersWeek
            },
            recent_activity: recentActivity
        });
    } catch (e) {
        console.error('Admin dashboard error:', e);
        res.status(500).json({ message: 'Failed to load dashboard' });
    }
};

// ============================================
// USERS
// ============================================
exports.getUsers = async (req, res) => {
    try {
        const { search, plan, status, sort, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClause = {};

        if (search) {
            whereClause[Op.or] = [
                { username: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (status === 'active') whereClause.is_active = true;
        if (status === 'banned') whereClause.is_active = false;
        if (status === 'admin') whereClause.is_admin = true;

        let orderClause = [['id', 'DESC']];
        if (sort === 'username') orderClause = [['username', 'ASC']];
        if (sort === 'newest') orderClause = [['id', 'DESC']];
        if (sort === 'oldest') orderClause = [['id', 'ASC']];

        const { count, rows: users } = await User.findAndCountAll({
            where: whereClause,
            attributes: { exclude: ['password', 'angel_password', 'angel_totp', 'backtest_password', 'backtest_totp'] },
            include: [{
                model: Subscription,
                where: { status: 'active' },
                required: false,
                include: [{ model: Plan, attributes: ['name', 'display_name', 'price'] }],
                order: [['end_date', 'DESC']],
                limit: 1
            }],
            order: orderClause,
            limit: parseInt(limit),
            offset
        });

        // Format users
        const formattedUsers = users.map(u => {
            const userData = u.toJSON();
            const activeSub = userData.Subscriptions?.[0];
            return {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                phone: userData.phone,
                is_admin: userData.is_admin,
                is_active: userData.is_active,
                last_login_at: userData.last_login_at,
                has_api_key: !!(userData.angel_api_key),
                plan: activeSub?.Plan?.display_name || activeSub?.Plan?.name || 'Free',
                plan_id: activeSub?.plan_id || null,
                plan_expires: activeSub?.end_date || null,
            };
        });

        res.json({
            users: formattedUsers,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit))
        });
    } catch (e) {
        console.error('Get users error:', e);
        res.status(500).json({ message: 'Failed to load users' });
    }
};

exports.getUserDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password', 'angel_password', 'angel_totp', 'backtest_password', 'backtest_totp'] },
            include: [
                {
                    model: Subscription,
                    include: [{ model: Plan, attributes: ['name', 'display_name', 'price', 'duration_days'] }],
                    order: [['createdAt', 'DESC']]
                }
            ]
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Get user trades (last 50)
        const trades = await Trade.findAll({
            where: { user_id: id },
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        // Get trade stats
        const tradeStats = await Trade.findOne({
            where: { user_id: id },
            attributes: [
                [fn('COUNT', col('id')), 'total_trades'],
                [fn('COALESCE', fn('SUM', col('pnl')), 0), 'total_pnl'],
                [fn('COUNT', literal("CASE WHEN pnl > 0 THEN 1 END")), 'winning_trades'],
                [fn('COUNT', literal("CASE WHEN pnl < 0 THEN 1 END")), 'losing_trades'],
            ],
            raw: true
        });

        // Get payments
        let payments = [];
        try {
            payments = await Payment.findAll({
                where: { user_id: id },
                include: [{ model: Plan, attributes: ['name', 'display_name', 'price'] }],
                order: [['createdAt', 'DESC']],
                limit: 20
            });
        } catch (e) { }

        // Get admin notes
        let notes = [];
        try {
            notes = await AdminNote.findAll({
                where: { user_id: id },
                include: [{ model: User, as: 'author', attributes: ['username'] }],
                order: [['createdAt', 'DESC']]
            });
        } catch (e) { }

        res.json({
            user: user.toJSON(),
            trades,
            trade_stats: {
                total_trades: parseInt(tradeStats?.total_trades) || 0,
                total_pnl: parseFloat(tradeStats?.total_pnl) || 0,
                winning_trades: parseInt(tradeStats?.winning_trades) || 0,
                losing_trades: parseInt(tradeStats?.losing_trades) || 0,
            },
            payments,
            notes
        });
    } catch (e) {
        console.error('Get user detail error:', e);
        res.status(500).json({ message: 'Failed to load user details' });
    }
};

exports.toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.is_admin) return res.status(400).json({ message: 'Cannot change admin status' });

        const newStatus = !user.is_active;
        await user.update({ is_active: newStatus });

        await logAction(req.user.id, newStatus ? 'user_activated' : 'user_banned', 'user', id,
            { username: user.username }, req.ip);

        res.json({ status: 'success', new_state: newStatus, message: `User ${newStatus ? 'activated' : 'banned'}` });
    } catch (e) {
        console.error('Toggle user error:', e);
        res.status(500).json({ message: 'Failed to update user status' });
    }
};

exports.assignPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_id, days } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const plan = await Plan.findByPk(plan_id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        // Deactivate current subscriptions
        await Subscription.update(
            { status: 'expired' },
            { where: { user_id: id, status: 'active' } }
        );

        // Create new subscription
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (parseInt(days) || plan.duration_days));

        await Subscription.create({
            user_id: id,
            plan_id: plan.id,
            start_date: startDate,
            end_date: endDate,
            status: 'active'
        });

        await logAction(req.user.id, 'plan_assigned', 'user', parseInt(id),
            { plan: plan.name, days: days || plan.duration_days, username: user.username }, req.ip);

        res.json({ status: 'success', message: `${plan.name} assigned to ${user.username} for ${days || plan.duration_days} days` });
    } catch (e) {
        console.error('Assign plan error:', e);
        res.status(500).json({ message: 'Failed to assign plan' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const hashed = await bcrypt.hash(new_password, 10);
        await user.update({ password: hashed });

        await logAction(req.user.id, 'password_reset', 'user', parseInt(id),
            { username: user.username }, req.ip);

        res.json({ status: 'success', message: 'Password reset successfully' });
    } catch (e) {
        console.error('Reset password error:', e);
        res.status(500).json({ message: 'Failed to reset password' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.is_admin) return res.status(400).json({ message: 'Cannot delete admin user' });

        const username = user.username;

        // Cascade: Delete related data
        await Trade.destroy({ where: { user_id: id } });
        await Subscription.destroy({ where: { user_id: id } });
        try { await Payment.destroy({ where: { user_id: id } }); } catch (e) { }
        try { await AdminNote.destroy({ where: { user_id: id } }); } catch (e) { }
        await user.destroy();

        await logAction(req.user.id, 'user_deleted', 'user', parseInt(id),
            { username }, req.ip);

        res.json({ status: 'success', message: `User ${username} deleted` });
    } catch (e) {
        console.error('Delete user error:', e);
        res.status(500).json({ message: 'Failed to delete user' });
    }
};

exports.addNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        if (!note || !note.trim()) {
            return res.status(400).json({ message: 'Note cannot be empty' });
        }

        const adminNote = await AdminNote.create({
            user_id: parseInt(id),
            admin_id: req.user.id,
            note: note.trim()
        });

        res.json({ status: 'success', note: adminNote });
    } catch (e) {
        console.error('Add note error:', e);
        res.status(500).json({ message: 'Failed to add note' });
    }
};

// ============================================
// TRADES (Global Order Book)
// ============================================
exports.getGlobalTrades = async (req, res) => {
    try {
        const { startDate, endDate, user_id, symbol, status, mode, page = 1, limit = 100 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClause = {};
        if (user_id) whereClause.user_id = user_id;
        if (symbol) whereClause.symbol = { [Op.iLike]: `%${symbol}%` };
        if (status && status !== 'all') whereClause.status = status;
        if (mode === 'paper') whereClause.is_simulated = true;
        if (mode === 'live') whereClause.is_simulated = false;

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59);
                whereClause.createdAt[Op.lte] = end;
            }
        }

        const { count, rows: trades } = await Trade.findAndCountAll({
            where: whereClause,
            include: [{ model: User, attributes: ['username'] }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        // Aggregate stats (without include to avoid column ambiguity)
        const stats = await Trade.findOne({
            where: whereClause,
            attributes: [
                [fn('COUNT', col('id')), 'total'],
                [fn('COALESCE', fn('SUM', col('pnl')), 0), 'total_pnl'],
                [fn('COUNT', literal("CASE WHEN pnl > 0 THEN 1 END")), 'winners'],
                [fn('COUNT', literal("CASE WHEN pnl < 0 THEN 1 END")), 'losers'],
                [fn('COUNT', literal("CASE WHEN is_simulated = false THEN 1 END")), 'live_count'],
                [fn('COUNT', literal("CASE WHEN is_simulated = true THEN 1 END")), 'paper_count'],
            ],
            raw: true
        });

        res.json({
            trades: trades.map(t => {
                const data = t.toJSON();
                return { ...data, username: data.User?.username || 'Unknown' };
            }),
            stats: {
                total: parseInt(stats?.total) || 0,
                total_pnl: parseFloat(stats?.total_pnl) || 0,
                winners: parseInt(stats?.winners) || 0,
                losers: parseInt(stats?.losers) || 0,
                live_count: parseInt(stats?.live_count) || 0,
                paper_count: parseInt(stats?.paper_count) || 0,
                win_rate: stats?.total > 0
                    ? ((parseInt(stats.winners) / parseInt(stats.total)) * 100).toFixed(1)
                    : '0.0'
            },
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit))
        });
    } catch (e) {
        console.error('Global trades error:', e);
        res.status(500).json({ message: 'Failed to load trades' });
    }
};

exports.exportTrades = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let whereClause = {};

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59);
                whereClause.createdAt[Op.lte] = end;
            }
        }

        const trades = await Trade.findAll({
            where: whereClause,
            include: [{ model: User, attributes: ['username'] }],
            order: [['createdAt', 'DESC']]
        });

        const headers = 'ID,User,Date,Symbol,Mode,Qty,Entry,Exit,PnL,Status,Type';
        const rows = trades.map(t => {
            const d = t.toJSON();
            return `${d.id},"${d.User?.username}",${d.timestamp || ''},"${d.symbol}",${d.mode},${d.quantity},${d.entry_price},${d.exit_price},${d.pnl},${d.status},${d.is_simulated ? 'PAPER' : 'LIVE'}`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="admin_trades_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send([headers, ...rows].join('\n'));
    } catch (e) {
        console.error('Export trades error:', e);
        res.status(500).json({ message: 'Failed to export' });
    }
};

// ============================================
// PLANS
// ============================================
exports.getPlans = async (req, res) => {
    try {
        const plans = await Plan.findAll({ order: [['price', 'ASC']] });

        // Get subscriber counts for each plan
        const plansWithCounts = await Promise.all(plans.map(async (p) => {
            const count = await Subscription.count({
                where: { plan_id: p.id, status: 'active' }
            });
            return { ...p.toJSON(), subscriber_count: count };
        }));

        res.json(plansWithCounts);
    } catch (e) {
        console.error('Get plans error:', e);
        res.status(500).json({ message: 'Failed to load plans' });
    }
};

exports.createPlan = async (req, res) => {
    try {
        const { name, display_name, price, duration_days, features, limits } = req.body;

        if (!name || !price) {
            return res.status(400).json({ message: 'Name and price are required' });
        }

        const plan = await Plan.create({
            name,
            display_name: display_name || name,
            price: parseFloat(price),
            duration_days: parseInt(duration_days) || 30,
            features: features || [],
            limits: limits || {},
            is_active: true
        });

        await logAction(req.user.id, 'plan_created', 'plan', plan.id,
            { name, price }, req.ip);

        res.json({ status: 'success', plan });
    } catch (e) {
        console.error('Create plan error:', e);
        res.status(500).json({ message: 'Failed to create plan' });
    }
};

exports.updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const plan = await Plan.findByPk(id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        await plan.update(updates);

        await logAction(req.user.id, 'plan_updated', 'plan', parseInt(id),
            { name: plan.name, updates }, req.ip);

        res.json({ status: 'success', plan });
    } catch (e) {
        console.error('Update plan error:', e);
        res.status(500).json({ message: 'Failed to update plan' });
    }
};

exports.deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await Plan.findByPk(id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        await plan.update({ is_active: false });

        await logAction(req.user.id, 'plan_deactivated', 'plan', parseInt(id),
            { name: plan.name }, req.ip);

        res.json({ status: 'success', message: `Plan ${plan.name} deactivated` });
    } catch (e) {
        console.error('Delete plan error:', e);
        res.status(500).json({ message: 'Failed to deactivate plan' });
    }
};

// ============================================
// REVENUE & PAYMENTS
// ============================================
exports.getRevenue = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const getRevenue = async (where) => {
            try {
                const result = await Payment.findOne({
                    attributes: [
                        [fn('COALESCE', fn('SUM', col('amount')), 0), 'total'],
                        [fn('COUNT', col('id')), 'count']
                    ],
                    where: { status: 'success', ...where },
                    raw: true
                });
                return { total: parseFloat(result?.total) || 0, count: parseInt(result?.count) || 0 };
            } catch (e) { return { total: 0, count: 0 }; }
        };

        const todayRevenue = await getRevenue({ createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } });
        const weekRevenue = await getRevenue({ createdAt: { [Op.gte]: weekStart } });
        const monthRevenue = await getRevenue({ createdAt: { [Op.gte]: monthStart } });
        const allTimeRevenue = await getRevenue({});

        // Monthly revenue chart data (last 12 months)
        let monthlyChart = [];
        try {
            for (let i = 11; i >= 0; i--) {
                const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
                const rev = await getRevenue({ createdAt: { [Op.gte]: start, [Op.lt]: end } });
                monthlyChart.push({
                    month: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    revenue: rev.total,
                    count: rev.count
                });
            }
        } catch (e) { }

        // Plan distribution
        let planDist = [];
        try {
            const plans = await Plan.findAll({ where: { is_active: true } });
            planDist = await Promise.all(plans.map(async (p) => {
                const count = await Subscription.count({ where: { plan_id: p.id, status: 'active' } });
                return { name: p.display_name || p.name, count, price: p.price };
            }));
        } catch (e) { }

        // Recent transactions
        let recentPayments = [];
        try {
            recentPayments = await Payment.findAll({
                include: [
                    { model: User, attributes: ['username'] },
                    { model: Plan, attributes: ['name', 'display_name'] }
                ],
                order: [['createdAt', 'DESC']],
                limit: 20
            });
        } catch (e) { }

        res.json({
            today: todayRevenue,
            week: weekRevenue,
            month: monthRevenue,
            all_time: allTimeRevenue,
            monthly_chart: monthlyChart,
            plan_distribution: planDist,
            recent_payments: recentPayments
        });
    } catch (e) {
        console.error('Revenue error:', e);
        res.status(500).json({ message: 'Failed to load revenue data' });
    }
};

// ============================================
// SYSTEM HEALTH
// ============================================
exports.getSystemHealth = async (req, res) => {
    try {
        const memUsage = process.memoryUsage();

        res.json({
            uptime: process.uptime(),
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            },
            node_version: process.version,
            platform: process.platform,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ message: 'Failed to get health' });
    }
};

exports.killSwitch = async (req, res) => {
    try {
        // Call Python engine to stop all bots
        const engineService = require('../services/engineService');

        // Get all users with running bots (we'll try to stop them all)
        const users = await User.findAll({ attributes: ['id'] });
        let stopped = 0;

        for (const user of users) {
            try {
                await engineService.stopBot(String(user.id));
                stopped++;
            } catch (e) { /* User might not have a running bot */ }
        }

        await logAction(req.user.id, 'kill_switch', 'system', null,
            { stopped_count: stopped }, req.ip);

        res.json({ status: 'success', message: `Kill switch activated. Attempted to stop ${stopped} bots.` });
    } catch (e) {
        console.error('Kill switch error:', e);
        res.status(500).json({ message: 'Kill switch failed: ' + e.message });
    }
};

exports.checkConnectivity = async (req, res) => {
    try {
        const start = Date.now();
        // Try to reach the Python engine
        const engineService = require('../services/engineService');
        await engineService.getStatus('health_check');
        const latency = Date.now() - start;

        res.json({ status: 'Connected', latency, engine: 'Online' });
    } catch (e) {
        res.json({ status: 'Disconnected', latency: 0, engine: 'Offline', error: e.message });
    }
};

// ============================================
// ANNOUNCEMENTS
// ============================================
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.findAll({
            include: [{ model: User, as: 'creator', attributes: ['username'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(announcements);
    } catch (e) {
        console.error('Get announcements error:', e);
        res.status(500).json({ message: 'Failed to load announcements' });
    }
};

exports.createAnnouncement = async (req, res) => {
    try {
        const { title, message, type, target } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }

        const announcement = await Announcement.create({
            title,
            message,
            type: type || 'info',
            target: target || 'all',
            created_by: req.user.id,
            is_active: true
        });

        await logAction(req.user.id, 'announcement_created', 'announcement', announcement.id,
            { title, type }, req.ip);

        res.json({ status: 'success', announcement });
    } catch (e) {
        console.error('Create announcement error:', e);
        res.status(500).json({ message: 'Failed to create announcement' });
    }
};

exports.deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const announcement = await Announcement.findByPk(id);
        if (!announcement) return res.status(404).json({ message: 'Not found' });

        await announcement.update({ is_active: false });

        await logAction(req.user.id, 'announcement_deleted', 'announcement', parseInt(id),
            { title: announcement.title }, req.ip);

        res.json({ status: 'success', message: 'Announcement deactivated' });
    } catch (e) {
        console.error('Delete announcement error:', e);
        res.status(500).json({ message: 'Failed to delete announcement' });
    }
};

// Active announcements for users
exports.getActiveAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.findAll({
            where: { is_active: true },
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        res.json(announcements);
    } catch (e) {
        res.json([]);
    }
};

// ============================================
// AUDIT LOGS
// ============================================
exports.getAuditLogs = async (req, res) => {
    try {
        const { action, target_type, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClause = {};
        if (action) whereClause.action = action;
        if (target_type) whereClause.target_type = target_type;

        const { count, rows: logs } = await AuditLog.findAndCountAll({
            where: whereClause,
            include: [{ model: User, as: 'admin', attributes: ['username'] }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            logs: logs.map(l => {
                const data = l.toJSON();
                return { ...data, admin_username: data.admin?.username || 'System' };
            }),
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit))
        });
    } catch (e) {
        console.error('Audit logs error:', e);
        res.status(500).json({ message: 'Failed to load audit logs' });
    }
};

exports.exportAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.findAll({
            include: [{ model: User, as: 'admin', attributes: ['username'] }],
            order: [['createdAt', 'DESC']],
            limit: 1000
        });

        const headers = 'ID,Time,Admin,Action,Target Type,Target ID,Details,IP';
        const rows = logs.map(l => {
            const d = l.toJSON();
            return `${d.id},"${d.createdAt}","${d.admin?.username}","${d.action}","${d.target_type || ''}",${d.target_id || ''},"${(d.details || '').replace(/"/g, '""')}","${d.ip_address || ''}"`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send([headers, ...rows].join('\n'));
    } catch (e) {
        res.status(500).json({ message: 'Failed to export' });
    }
};

// ============================================
// EXPORT USERS CSV
// ============================================
exports.exportUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password', 'angel_password', 'angel_totp', 'backtest_password', 'backtest_totp'] },
            include: [{
                model: Subscription,
                where: { status: 'active' },
                required: false,
                include: [{ model: Plan, attributes: ['name'] }]
            }]
        });

        const headers = 'ID,Username,Email,Phone,Plan,Active,Admin,Has API Key';
        const rows = users.map(u => {
            const d = u.toJSON();
            const plan = d.Subscriptions?.[0]?.Plan?.name || 'Free';
            return `${d.id},"${d.username}","${d.email || ''}","${d.phone || ''}","${plan}",${d.is_active},${d.is_admin},${d.angel_api_key ? 'Yes' : 'No'}`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="users_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send([headers, ...rows].join('\n'));
    } catch (e) {
        res.status(500).json({ message: 'Failed to export' });
    }
};
