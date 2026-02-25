const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/ai/status
router.get('/status', async (req, res) => {
    try {
        const [[{ active_models }]] = await db.query('SELECT COUNT(*) as active_models FROM ai_models WHERE is_active = TRUE');
        const [[{ total_detections }]] = await db.query('SELECT COUNT(*) as total_detections FROM ai_detections WHERE detected_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
        const [[latest]] = await db.query('SELECT anomaly_score, anomaly_type, detected_at FROM ai_detections ORDER BY detected_at DESC LIMIT 1');

        res.json({
            active_models,
            detections_24h: total_detections,
            latest_detection: latest || null,
            engine_url: `http://127.0.0.1:${process.env.AI_ENGINE_PORT || 8000}`
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/ai/detections
router.get('/detections', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        let query, params;

        if (req.user.role === 'admin') {
            query = `SELECT d.*, pp.proxy_port, m.model_name FROM ai_detections d
               LEFT JOIN proxy_ports pp ON d.proxy_port_id = pp.id
               LEFT JOIN ai_models m ON d.model_id = m.id
               ORDER BY d.detected_at DESC LIMIT ?`;
            params = [parseInt(limit)];
        } else {
            query = `SELECT d.*, pp.proxy_port, m.model_name FROM ai_detections d
               LEFT JOIN proxy_ports pp ON d.proxy_port_id = pp.id
               LEFT JOIN servers s ON pp.server_id = s.id
               LEFT JOIN ai_models m ON d.model_id = m.id
               WHERE s.user_id = ? ORDER BY d.detected_at DESC LIMIT ?`;
            params = [req.user.id, parseInt(limit)];
        }

        const [detections] = await db.query(query, params);
        res.json(detections);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/ai/models
router.get('/models', authenticate, requireAdmin, async (req, res) => {
    try {
        const [models] = await db.query('SELECT * FROM ai_models ORDER BY trained_at DESC');
        res.json(models);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// PUT /api/ai/detections/:id/feedback — Đánh dấu false positive
router.put('/detections/:id/feedback', async (req, res) => {
    try {
        const { false_positive } = req.body;
        await db.query(
            'UPDATE ai_detections SET false_positive = ?, reviewed_by = ? WHERE id = ?',
            [!!false_positive, req.user.id, req.params.id]
        );
        res.json({ message: 'Feedback đã lưu' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// POST /api/ai/retrain — Trigger retrain (admin)
router.post('/retrain', authenticate, requireAdmin, async (req, res) => {
    try {
        const axios = require('axios');
        const aiUrl = `http://127.0.0.1:${process.env.AI_ENGINE_PORT || 8000}/retrain`;
        await axios.post(aiUrl, {}, { timeout: 5000 });
        res.json({ message: 'Retrain đã trigger' });
    } catch (err) {
        res.json({ message: 'Retrain request sent (AI engine may be offline)', warning: true });
    }
});

module.exports = router;
