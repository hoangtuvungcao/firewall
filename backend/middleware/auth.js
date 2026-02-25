const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../config/database');

// Verify JWT token
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token không hợp lệ' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.JWT_SECRET);

        const [rows] = await db.query(
            'SELECT id, username, email, role, telegram_id, is_active FROM users WHERE id = ?',
            [decoded.id]
        );

        if (!rows.length || !rows[0].is_active) {
            return res.status(401).json({ error: 'Tài khoản không tồn tại hoặc bị khóa' });
        }

        req.user = rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token hết hạn hoặc không hợp lệ' });
    }
};

// Require admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Cần quyền admin' });
    }
    next();
};

module.exports = { authenticate, requireAdmin };
