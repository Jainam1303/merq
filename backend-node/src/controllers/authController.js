const { User, Subscription, Plan } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

// Register User
exports.register = async (req, res) => {
    try {
        let { username, email, password } = req.body;

        // Legacy Compatibility: If email is missing, generate one
        if (!email && username) {
            email = `${username.toLowerCase()}@merq.internal`;
        }

        // Validations
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const existingUser = await User.findOne({ where: { email } });
        // Also check username uniqueness if we constructed email from it, or generally
        const existingUsername = await User.findOne({ where: { username } });

        if (existingUser || existingUsername) {
            return res.status(409).json({ message: 'User already exists' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create User
        const newUser = await User.create({
            username,
            email,
            password: password_hash // Field name is now 'password'
        });

        // Assign Default "Free" Plan
        try {
            const freePlan = await Plan.findOne({ where: { name: 'Free' } });
            if (freePlan) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + freePlan.duration_days);

                await Subscription.create({
                    user_id: newUser.id,
                    plan_id: freePlan.id,
                    start_date: startDate,
                    end_date: endDate,
                    status: 'active'
                });
                console.log(`Assigned Free plan to user ${newUser.username}`);
            } else {
                console.warn("Free plan not found in database. User created without subscription.");
            }
        } catch (subError) {
            console.error("Failed to assign default plan:", subError);
            // Don't fail the registration, just log it
        }

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            userId: newUser.id
        });
    } catch (error) {
        console.error('Registration Error:', error);
        if (error.original) {
            console.error('SQL Error:', error.original.message); // Log DB error details
        }
        res.status(500).json({ message: 'Server error during registration', detail: error.message });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        // Legacy frontend sends 'username', new might send 'email'
        const { email, username, password } = req.body;

        const lookupKey = email || username;

        if (!lookupKey || !password) {
            return res.status(400).json({ message: 'Missing credentials' });
        }

        // Find User by Email OR Username (Case Insensitive for Postgres)
        const { Op } = require('sequelize');
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: lookupKey },
                    { username: lookupKey }
                    // TODO: In Phase 9, add Op.iLike for case-insensitive match
                ]
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: 'user' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set Cookie (for Dashboard access)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            status: 'success',
            message: 'Login successful',
            token,
            user: user.username,
            userId: user.id
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};
