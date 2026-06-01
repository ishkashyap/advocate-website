const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

const authenticateToken = (req, res, next) => {
    // Read JWT from HttpOnly cookie, fallback to Authorization header for flexibility
    const token = req.cookies?.token || (req.headers.authorization?.split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

module.exports = {
    authenticateToken
};
