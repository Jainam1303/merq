const { User, ReferralEarning, Payment, Subscription, Plan } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

// ─── Helper: Generate unique referral code ───
function generateReferralCode(username) {
    const base = username.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    return `${base}${rand}`;
}

// Default commission rate (can be made configurable via env or admin settings)
const COMMISSION_RATE = parseFloat(process.env.REFERRAL_COMMISSION_RATE || '5');

// ─── GET /api/referral/stats ───
// Returns referral dashboard stats for the logged-in user
exports.getStats = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if user has a paid subscription (referral code only for paid users)
        const activeSub = await Subscription.findOne({
            where: { user_id: user.id, status: 'active' },
            include: [{ model: Plan }],
        });

        const hasPaidPlan = activeSub && activeSub.Plan && activeSub.Plan.price > 0;

        // If user has a paid plan but no referral code yet, generate one
        if (hasPaidPlan && !user.referral_code) {
            let code = generateReferralCode(user.username);
            // Ensure uniqueness
            let attempts = 0;
            while (await User.findOne({ where: { referral_code: code } }) && attempts < 10) {
                code = generateReferralCode(user.username);
                attempts++;
            }
            user.referral_code = code;
            await user.save();
        }

        // Count referrals
        const totalReferrals = await User.count({ where: { referred_by: user.id } });

        // Count referrals who bought a paid plan
        const paidReferrals = await ReferralEarning.count({
            where: { referrer_id: user.id },
            distinct: true,
            col: 'referred_id',
        });

        // Total earnings
        const earningsResult = await ReferralEarning.sum('commission_amount', {
            where: { referrer_id: user.id, status: { [Op.ne]: 'rejected' } },
        });
        const totalEarnings = parseFloat(earningsResult || 0);

        // Pending earnings
        const pendingResult = await ReferralEarning.sum('commission_amount', {
            where: { referrer_id: user.id, status: 'pending' },
        });
        const pendingEarnings = parseFloat(pendingResult || 0);

        // Paid earnings
        const paidResult = await ReferralEarning.sum('commission_amount', {
            where: { referrer_id: user.id, status: 'paid' },
        });
        const paidEarnings = parseFloat(paidResult || 0);

        res.json({
            referral_code: user.referral_code,
            has_paid_plan: hasPaidPlan,
            commission_rate: COMMISSION_RATE,
            total_referrals: totalReferrals,
            paid_referrals: paidReferrals,
            total_earnings: totalEarnings,
            pending_earnings: pendingEarnings,
            paid_earnings: paidEarnings,
        });
    } catch (e) {
        console.error('Referral stats error:', e);
        res.status(500).json({ message: 'Failed to load referral stats' });
    }
};

// ─── GET /api/referral/earnings ───
// Returns list of referral earnings for the logged-in user
exports.getEarnings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const { count, rows } = await ReferralEarning.findAndCountAll({
            where: { referrer_id: req.user.id },
            include: [
                { model: User, as: 'referred', attributes: ['id', 'username', 'email'] },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        res.json({
            earnings: rows,
            total: count,
            page,
            pages: Math.ceil(count / limit),
        });
    } catch (e) {
        console.error('Referral earnings error:', e);
        res.status(500).json({ message: 'Failed to load earnings' });
    }
};

// ─── GET /api/referral/referrals ───
// Returns list of users referred by the logged-in user
exports.getReferrals = async (req, res) => {
    try {
        const referrals = await User.findAll({
            where: { referred_by: req.user.id },
            attributes: ['id', 'username', 'email', 'createdAt'],
            order: [['createdAt', 'DESC']],
        });

        // For each referral, check if they have a paid plan
        const enriched = await Promise.all(referrals.map(async (ref) => {
            const sub = await Subscription.findOne({
                where: { user_id: ref.id, status: 'active' },
                include: [{ model: Plan, attributes: ['name', 'price'] }],
            });

            const totalCommission = await ReferralEarning.sum('commission_amount', {
                where: { referrer_id: req.user.id, referred_id: ref.id },
            });

            return {
                id: ref.id,
                username: ref.username,
                email: ref.email,
                joined_at: ref.createdAt,
                current_plan: sub?.Plan?.name || 'Free',
                plan_price: sub?.Plan?.price || 0,
                total_commission: parseFloat(totalCommission || 0),
            };
        }));

        res.json({ referrals: enriched });
    } catch (e) {
        console.error('Referral list error:', e);
        res.status(500).json({ message: 'Failed to load referrals' });
    }
};

// ─── POST /api/referral/generate-code ───
// Manually generate/regenerate referral code (for users who already have a paid plan)
exports.generateCode = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        // Check if user has a paid subscription
        const activeSub = await Subscription.findOne({
            where: { user_id: user.id, status: 'active' },
            include: [{ model: Plan }],
        });

        if (!activeSub || !activeSub.Plan || activeSub.Plan.price <= 0) {
            return res.status(403).json({
                message: 'You need an active paid plan to get a referral code',
            });
        }

        // Generate new code if none exists, or keep existing
        if (!user.referral_code) {
            let code = generateReferralCode(user.username);
            let attempts = 0;
            while (await User.findOne({ where: { referral_code: code } }) && attempts < 10) {
                code = generateReferralCode(user.username);
                attempts++;
            }
            user.referral_code = code;
            await user.save();
        }

        res.json({
            referral_code: user.referral_code,
            referral_link: `${process.env.FRONTEND_URL || 'https://merqprime.in'}?ref=${user.referral_code}`,
        });
    } catch (e) {
        console.error('Generate referral code error:', e);
        res.status(500).json({ message: 'Failed to generate referral code' });
    }
};

// ─── ADMIN: GET /api/admin/referrals ───
// Admin view of all referral activity
exports.adminGetReferrals = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status;

        const where = {};
        if (status) where.status = status;

        const { count, rows } = await ReferralEarning.findAndCountAll({
            where,
            include: [
                { model: User, as: 'referrer', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'referred', attributes: ['id', 'username', 'email'] },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        // Summary stats
        const totalEarnings = await ReferralEarning.sum('commission_amount', {
            where: { status: { [Op.ne]: 'rejected' } },
        }) || 0;
        const pendingEarnings = await ReferralEarning.sum('commission_amount', {
            where: { status: 'pending' },
        }) || 0;
        const paidEarnings = await ReferralEarning.sum('commission_amount', {
            where: { status: 'paid' },
        }) || 0;
        const totalReferrers = await User.count({
            where: { referral_code: { [Op.ne]: null } },
        });

        res.json({
            earnings: rows,
            total: count,
            page,
            pages: Math.ceil(count / limit),
            summary: {
                total_earnings: parseFloat(totalEarnings),
                pending_earnings: parseFloat(pendingEarnings),
                paid_earnings: parseFloat(paidEarnings),
                total_referrers: totalReferrers,
                commission_rate: COMMISSION_RATE,
            },
        });
    } catch (e) {
        console.error('Admin referral list error:', e);
        res.status(500).json({ message: 'Failed to load referrals' });
    }
};

// ─── ADMIN: PUT /api/admin/referrals/:id/status ───
// Update referral earning status (approve, pay, reject)
exports.adminUpdateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        if (!['pending', 'approved', 'paid', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const earning = await ReferralEarning.findByPk(id);
        if (!earning) return res.status(404).json({ message: 'Earning not found' });

        earning.status = status;
        if (notes) earning.notes = notes;
        if (status === 'paid') earning.paid_at = new Date();

        await earning.save();

        // If approved or paid, update the referrer's total
        if (status === 'paid') {
            const referrer = await User.findByPk(earning.referrer_id);
            if (referrer) {
                const total = await ReferralEarning.sum('commission_amount', {
                    where: { referrer_id: referrer.id, status: 'paid' },
                });
                referrer.referral_earnings_total = total || 0;
                await referrer.save();
            }
        }

        res.json({ message: `Earning status updated to ${status}`, earning });
    } catch (e) {
        console.error('Admin update referral status error:', e);
        res.status(500).json({ message: 'Failed to update status' });
    }
};

// ─── ADMIN: PUT /api/admin/referrals/settings ───
// Update referral system settings (commission rate, etc.)
exports.adminGetSettings = async (req, res) => {
    try {
        res.json({
            commission_rate: COMMISSION_RATE,
            min_payout: parseFloat(process.env.REFERRAL_MIN_PAYOUT || '100'),
        });
    } catch (e) {
        res.status(500).json({ message: 'Failed to load settings' });
    }
};
