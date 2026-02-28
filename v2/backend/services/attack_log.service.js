const db = require('../config/database');

/**
 * ATTACK LOGS SERVICE
 * Quản lý việc lưu trữ và truy vấn lịch sử tấn công
 */
const AttackLogService = {
    /**
     * Khởi tạo bảng nếu chưa có
     */
    async init() {
        const sql = `
      CREATE TABLE IF NOT EXISTS attack_logs (
        id INT AUTO_VALUE_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        type VARCHAR(50) NOT NULL,
        pps INT DEFAULT 0,
        bps BIGINT DEFAULT 0,
        severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        action VARCHAR(20) DEFAULT 'BLOCKED',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip (ip),
        INDEX idx_ts (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
        try {
            await db.query(sql);
            console.log('[ATTACK-LOG] Database initialized.');
        } catch (e) {
            console.error('[ATTACK-LOG] Init Error:', e.message);
        }
    },

    /**
     * Truy vết cuộc tấn công mới
     */
    async log(data) {
        const sql = `INSERT INTO attack_logs (ip, type, pps, bps, severity, action) VALUES (?, ?, ?, ?, ?, ?)`;
        try {
            await db.execute(sql, [
                data.ip,
                data.type || 'UNKNOWN',
                data.pps || 0,
                data.bps || 0,
                data.severity || 'MEDIUM',
                data.action || 'BLOCKED'
            ]);

            // Update real-time cho Dashboard
            if (global.broadcast) {
                global.broadcast({ type: 'NEW_ATTACK_LOG', data });
            }
        } catch (e) {
            console.error('[ATTACK-LOG] Log Error:', e.message);
        }
    },

    /**
     * Lấy lịch sử 50 cuộc tấn công gần nhất
     */
    async getRecent(limit = 50) {
        const [rows] = await db.query(`SELECT * FROM attack_logs ORDER BY timestamp DESC LIMIT ?`, [limit]);
        return rows;
    }
};

module.exports = AttackLogService;
