const { User, Subscription, Plan, Payment, ReferralEarning } = require('../models');

// Get Profile
exports.getProfile = async (req, res) => {
    try {
        // distinct attempt to fetch full hierarchy
        let user;
        try {
            user = await User.findByPk(req.user.id, {
                attributes: { exclude: ['password'] },
                include: [
                    {
                        model: Subscription,
                        include: [Plan]
                    }
                ]
            });
        } catch (dbError) {
            console.error('[GetProfile] Association Query Failed. Falling back to basic user fetch.', dbError.message);
            // Fallback: Fetch user without associations
            user = await User.findByPk(req.user.id, {
                attributes: { exclude: ['password'] }
            });
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Map to legacy fields for frontend compatibility
        const userData = user.get({ plain: true });

        // Handle both singular and plural nested properties from Sequelize
        const subData = userData.Subscription || userData.Subscriptions;
        const subs = Array.isArray(subData) ? subData : (subData ? [subData] : []);

        // Find latest active subscription
        const activeSub = subs
            .sort((a, b) => new Date(b.end_date) - new Date(a.end_date))
            .find(s => s && s.status === 'active');

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
            'backtest_api_key', 'backtest_client_code', 'backtest_password', 'backtest_totp',
            'whatsapp_phone', 'whatsapp_api_key'
        ];

        // API Key fields that should NOT be overwritten with empty strings
        const apiKeyFields = [
            'angel_api_key', 'angel_client_code', 'angel_password', 'angel_totp',
            'backtest_api_key', 'backtest_client_code', 'backtest_password', 'backtest_totp'
        ];

        console.log('[UpdateProfile] Applying updates:', Object.keys(updates));
        for (let key of Object.keys(updates)) {
            if (allowedFields.includes(key)) {
                const value = updates[key];

                // CRITICAL: Don't overwrite API keys with empty strings
                // This prevents accidental deletion of API credentials
                if (apiKeyFields.includes(key)) {
                    if (!value || value.trim() === '') {
                        console.log(`[UpdateProfile] SKIPPING empty API key field: ${key}`);
                        continue; // Skip - don't overwrite existing value with empty
                    }
                }

                user[key] = value;
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
// Get All Plans
exports.getPlans = async (req, res) => {
    try {
        let plans = [];
        try {
            plans = await Plan.findAll({
                where: { is_active: true },
                order: [['price', 'ASC']]
            });
        } catch (dbError) {
            console.error('[GetPlans] Database Fetch Failed (Table might be missing):', dbError.message);
            // Fallthrough to mock data block below
            plans = [];
        }

        // If no plans in DB, return empty array (User requested NO mock data)
        if (plans.length === 0) {
            return res.json([]);
        }

        // Map DB plans to frontend format if needed, or return as is
        // Frontend expects: id, name, price, duration_days, features (array)
        // DB features is JSONB, so it comes as object/array automatically in Sequelize
        const formattedPlans = plans.map(p => ({
            id: p.id,
            plan: p.name, // Frontend uses 'plan' in some places, 'name' in others
            name: p.name,
            price: parseFloat(p.price),
            duration: p.duration_days === 30 ? 'Monthly' : (p.duration_days === 365 ? 'Yearly' : `${p.duration_days} Days`),
            duration_days: p.duration_days,
            features: p.features || []
        }));

        res.json(formattedPlans);
    } catch (error) {
        console.error('Get Plans Error:', error);
        res.status(500).json({ message: 'Server error fetching plans' });
    }
};
exports.addToken = async (req, res) => {
    try {
        const { Stock } = require('../models');
        const { symbol, token, exchange } = req.body;

        if (!symbol) return res.status(400).json({ message: 'Symbol is required' });

        const [stock, created] = await Stock.findOrCreate({
            where: { symbol },
            defaults: {
                token: token || '0',
                exchange: exchange || 'NSE'
            }
        });

        res.json({ message: 'Token added', stock });
    } catch (error) {
        console.error('Add Token Error:', error);
        res.status(500).json({ message: 'Failed to add token' });
    }
};

const Razorpay = require('razorpay');
const crypto = require('crypto');

exports.createOrder = async (req, res) => {
    try {
        const { plan_id } = req.body;
        const plan = await Plan.findByPk(plan_id);
        if (!plan) return res.status(404).json({ status: 'error', message: 'Plan not found' });

        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const options = {
            amount: Math.round(plan.price * 100), // amount in smallest currency unit
            currency: "INR",
            receipt: `order_rcptid_${Date.now()}_${req.user.id}`
        };

        const order = await instance.orders.create(options);

        // Fetch user for prefill
        const user = await User.findByPk(req.user.id);

        res.json({
            status: 'success',
            key: process.env.RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            order_id: order.id,
            prefill: {
                name: user.username,
                email: user.email,
                contact: user.phone
            }
        });

    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ status: 'error', message: 'Payment initiation failed. Check Keys.' });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = req.body;

        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        console.log(`[VerifyPayment] Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}`);
        console.log(`[VerifyPayment] Recv Sig: ${razorpay_signature}`);
        console.log(`[VerifyPayment] Gen Sig: ${generated_signature}`);

        if (generated_signature !== razorpay_signature) {
            console.error('[VerifyPayment] Signature Mismatch');
            return res.json({ status: 'error', message: 'Invalid Signature' });
        }

        // Payment Successful - Update Subscription
        const plan = await Plan.findByPk(plan_id);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.duration_days);

        // Deactivate old plans
        await Subscription.update({ status: 'expired' }, { where: { user_id: req.user.id, status: 'active' } });

        // Activate new plan
        await Subscription.create({
            user_id: req.user.id,
            plan_id: plan.id,
            start_date: startDate,
            end_date: endDate,
            status: 'active'
        });

        // Track payment for revenue analytics
        try {
            await Payment.create({
                user_id: req.user.id,
                plan_id: plan.id,
                razorpay_order_id: razorpay_order_id,
                razorpay_payment_id: razorpay_payment_id,
                amount: plan.price,
                currency: 'INR',
                status: 'success'
            });
        } catch (payErr) {
            console.error('Payment tracking error:', payErr.message);
        }

        // ── Referral Commission ──
        // If this user was referred by someone, award commission to the referrer
        try {
            const buyer = await User.findByPk(req.user.id, { attributes: ['id', 'referred_by'] });
            if (buyer && buyer.referred_by && plan.price > 0) {
                const COMMISSION_RATE = parseFloat(process.env.REFERRAL_COMMISSION_RATE || '5');
                const commissionAmount = (plan.price * COMMISSION_RATE) / 100;

                // Find the payment record we just created
                const paymentRecord = await Payment.findOne({
                    where: { razorpay_payment_id },
                    order: [['createdAt', 'DESC']],
                });

                await ReferralEarning.create({
                    referrer_id: buyer.referred_by,
                    referred_id: buyer.id,
                    payment_id: paymentRecord?.id || null,
                    plan_id: plan.id,
                    payment_amount: plan.price,
                    commission_rate: COMMISSION_RATE,
                    commission_amount: commissionAmount,
                    status: 'pending',
                });

                console.log(`[Referral] Commission ₹${commissionAmount} earned by user ${buyer.referred_by} from user ${buyer.id}`);
            }
        } catch (refErr) {
            console.error('Referral commission error:', refErr.message);
        }

        res.json({ status: 'success', message: 'Subscription Activated' });

    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ status: 'error', message: 'Verification failed' });
    }
};
