const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. Check Cookies (Primary for Dashboard)
    let token = req.cookies ? req.cookies.token : null;

    // 2. Check Authorization Header (Backup)
    if (!token) {
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) return res.status(403).json({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod', (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized: Invalid token' });

        // Attach user info to request
        req.user = decoded;
        next();
    });
};

module.exports = { verifyToken };
