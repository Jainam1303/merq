const { User, Subscription, Plan } = require('../models');

// Get Profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Subscription,
                    include: [Plan]
                }
            ]
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Map to legacy fields for frontend compatibility
        const userData = user.get({ plain: true });

        // Handle both singular and plural nested properties from Sequelize
        const subData = userData.Subscription || userData.Subscriptions;
        const subs = Array.isArray(subData) ? subData : (subData ? [subData] : []);
        const activeSub = subs.find(s => s && s.status === 'active');

        if (activeSub) {
            userData.plan_id = activeSub.plan_id;
            userData.plan_name = activeSub.Plan?.name;
            userData.plan_expiry = activeSub.end_date;
            userData.plan = {
                name: activeSub.Plan?.name,
                price: activeSub.Plan?.price,
                duration_days: activeSub.Plan?.duration_days,
                start_date: activeSub.start_date,
                end_date: activeSub.end_date
            };
        }

        res.json(userData);
    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

// Check Plan status
exports.getPlanStatus = async (req, res) => {
    try {
        const sub = await Subscription.findOne({
            where: { user_id: req.user.id, status: 'active' },
            include: [Plan],
            order: [['end_date', 'DESC']]
        });

        if (!sub) {
            return res.json({ hasActivePlan: false, plan: null });
        }

        res.json({
            hasActivePlan: true,
            plan: sub.Plan.name,
            limits: sub.Plan.limits,
            expiresAt: sub.end_date
        });
    } catch (error) {
        console.error('Plan Status Error:', error);
        res.status(500).json({ message: 'Server error checking plan' });
    }
};
// Update Profile
exports.updateProfile = async (req, res) => {
    console.log('[UpdateProfile] Request received for User ID:', req.user?.id);
    try {
        const userId = req.user.id;
        const updates = req.body;
        console.log('[UpdateProfile] Body keys:', Object.keys(updates));

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Security check: Don't allow updating id or username for now via this endpoint
        delete updates.id;
        delete updates.username;

        // Handle password update separately if provided
        if (updates.new_password) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(updates.new_password, salt);
            delete updates.new_password;
        }

        // Apply field updates (Whitelist approach for safety)
        const allowedFields = [
            'email', 'phone',
            'angel_api_key', 'angel_client_code', 'angel_password', 'angel_totp',
            'backtest_api_key', 'backtest_client_code', 'backtest_password', 'backtest_totp'
        ];

        console.log('[UpdateProfile] Applying updates:', Object.keys(updates));
        for (let key of Object.keys(updates)) {
            if (allowedFields.includes(key)) {
                user[key] = updates[key];
                console.log(`[UpdateProfile] Set field: ${key}`);
            }
        }

        await user.save();
        console.log('[UpdateProfile] Success for User:', userId);
        res.json({ status: 'success', message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update Profile Error:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ status: 'error', message: error.message || 'Server error updating profile' });
    }
};
