const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Admin Authentication Middleware
 * Verifies the JWT token AND checks if the user has admin privileges.
 * Must be used on all /admin/* routes.
 */
const verifyAdmin = async (req, res, next) => {
    try {
        // 1. Get token from cookies or header
        let token = req.cookies ? req.cookies.token : null;
        if (!token) {
            const authHeader = req.headers['authorization'];
            if (authHeader) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
        }

        // 2. Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod');
        req.user = decoded;

        // 3. Check admin status from database (not just from token)
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (!user.is_admin) {
            return res.status(403).json({ message: 'Admin privileges required' });
        }

        // Attach full user info
        req.adminUser = user;
        next();
    } catch (err) {
        console.error('Admin auth error:', err.message);
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

module.exports = { verifyAdmin };
