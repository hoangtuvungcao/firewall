const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const [users] = await db.query(`
      SELECT u.id, u.username, u.email, u.role, u.telegram_id, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM servers s WHERE s.user_id = u.id) as server_count,
        (SELECT k.key_code FROM license_keys k WHERE k.user_id = u.id AND k.status = 'active' LIMIT 1) as active_key
      FROM users u ORDER BY u.created_at DESC
    `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// PUT /api/admin/users/:id/role — Cấp quyền
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Role phải là admin hoặc user' });
        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
        res.json({ message: 'Cập nhật quyền thành công' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// PUT /api/admin/users/:id/toggle — Khóa/mở user
router.put('/users/:id/toggle', async (req, res) => {
    try {
        await db.query('UPDATE users SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
        res.json({ message: 'Cập nhật trạng thái thành công' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/admin/stats — Thống kê hệ thống
router.get('/stats', async (req, res) => {
    try {
        const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM users');
        const [[{ active_keys }]] = await db.query('SELECT COUNT(*) as active_keys FROM license_keys WHERE status = "active"');
        const [[{ total_proxies }]] = await db.query('SELECT COUNT(*) as total_proxies FROM proxy_ports WHERE is_active = TRUE');
        const [[{ attacks_today }]] = await db.query('SELECT COUNT(*) as attacks_today FROM attack_logs WHERE started_at >= CURDATE()');

        // System stats
        let system = {};
        try {
            const { stdout: uptime } = await execAsync('uptime -p');
            const { stdout: loadavg } = await execAsync('cat /proc/loadavg');
            const { stdout: meminfo } = await execAsync("free -m | awk 'NR==2{printf \"%d/%dMB (%.1f%%)\", $3,$2,$3*100/$2 }'");
            const { stdout: conntrack } = await execAsync('cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null || echo 0');
            const { stdout: conntrackMax } = await execAsync('cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null || echo 0');

            system = {
                uptime: uptime.trim(),
                load: loadavg.trim().split(' ').slice(0, 3).join(' '),
                memory: meminfo.trim(),
                conntrack: `${conntrack.trim()}/${conntrackMax.trim()}`
            };
        } catch (e) {
            system = { error: 'Cannot get system stats' };
        }

        res.json({ total_users, active_keys, total_proxies, attacks_today, system });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// POST /api/admin/firewall/reload
router.post('/firewall/reload', async (req, res) => {
    try {
        const { syncFirewallRules } = require('../services/firewall.service');
        await syncFirewallRules();
        res.json({ message: 'Firewall rules đã reload' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi reload firewall' });
    }
});

// GET /api/admin/servers — Tất cả servers (admin)
router.get('/servers', async (req, res) => {
    try {
        const [servers] = await db.query(`
      SELECT s.*, u.username as owner, k.key_code,
        (SELECT COUNT(*) FROM proxy_ports pp WHERE pp.server_id = s.id) as port_count
      FROM servers s
      JOIN users u ON s.user_id = u.id
      JOIN license_keys k ON s.key_id = k.id
      ORDER BY s.created_at DESC
    `);
        res.json(servers);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/admin/proxies — Tất cả proxies (admin)
router.get('/proxies', async (req, res) => {
    try {
        const config = require('../config/config');
        const [proxies] = await db.query(`
      SELECT pp.*, s.name as server_name, s.target_ip, u.username as owner
      FROM proxy_ports pp
      JOIN servers s ON pp.server_id = s.id
      JOIN users u ON s.user_id = u.id
      ORDER BY pp.created_at DESC
    `);
        res.json(proxies.map(p => ({
            ...p,
            proxy_address: `${config.VPS_PUBLIC_IP}:${p.proxy_port}`,
            target_address: `${p.target_ip}:${p.target_port}`
        })));
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;
