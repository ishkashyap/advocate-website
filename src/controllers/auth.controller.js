const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { get } = require('../config/database');
const { jwtSecret, nodeEnv } = require('../config/env');

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        
        const user = await get("SELECT * FROM admin WHERE username = $1", [username]);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, jwtSecret, { expiresIn: '24h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: nodeEnv === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true, username: user.username });
    } catch (err) {
        next(err);
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
};

const checkAuth = (req, res) => {
    res.json({ success: true, user: req.user });
};

const changeCredentials = async (req, res, next) => {
    try {
        const { username, password, currentPassword } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }
        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Current password is required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        const user = await get("SELECT * FROM admin WHERE id = $1", [req.user.id]);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await require('../config/database').run(
            "UPDATE admin SET username = $1, password = $2 WHERE id = $3",
            [username, hashedPassword, req.user.id]
        );

        res.json({ success: true, message: 'Credentials updated successfully' });
    } catch (err) {
        if (err.message && err.message.includes('duplicate key')) {
            return res.status(400).json({ success: false, error: 'Username already taken' });
        }
        next(err);
    }
};

module.exports = {
    login,
    logout,
    checkAuth,
    changeCredentials
};
