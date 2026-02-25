const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/servers
router.get('/', async (req, res) => {
    try {
        const [servers] = await db.query(`
      SELECT s.*, k.key_code, k.max_ports_per_server,
        (SELECT COUNT(*) FROM proxy_ports pp WHERE pp.server_id = s.id) as port_count
      FROM servers s
      JOIN license_keys k ON s.key_id = k.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `, [req.user.id]);
        res.json(servers);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// POST /api/servers
router.post('/', async (req, res) => {
    try {
        const { name, target_ip } = req.body;

        if (!target_ip) return res.status(400).json({ error: 'Cần target_ip' });

        // Validate IP format
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(target_ip)) return res.status(400).json({ error: 'IP không hợp lệ' });

        // Lấy key của user
        const [keys] = await db.query(
            'SELECT * FROM license_keys WHERE user_id = ? AND status = "active"', [req.user.id]
        );
        if (!keys.length) return res.status(400).json({ error: 'Không có key active' });

        const key = keys[0];

        // Kiểm tra quota server
        const [count] = await db.query(
            'SELECT COUNT(*) as c FROM servers WHERE key_id = ?', [key.id]
        );
        if (count[0].c >= key.max_servers) {
            return res.status(400).json({ error: `Đã đạt giới hạn ${key.max_servers} server` });
        }

        const [result] = await db.query(
            'INSERT INTO servers (user_id, key_id, name, target_ip) VALUES (?, ?, ?, ?)',
            [req.user.id, key.id, name || 'My Server', target_ip]
        );

        res.status(201).json({
            message: 'Server đã thêm',
            server: { id: result.insertId, name: name || 'My Server', target_ip }
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// DELETE /api/servers/:id
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM servers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Server không tồn tại' });
        res.json({ message: 'Server đã xóa' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;
