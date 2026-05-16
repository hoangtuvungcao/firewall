require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { WebSocketServer } = require('ws');
const cron = require('node-cron');

const db = require('./config/database');
const config = require('./config/config');

// Routes
const authRoutes = require('./routes/auth.routes');
const keyRoutes = require('./routes/key.routes');
const proxyRoutes = require('./routes/proxy.routes');
const serverRoutes = require('./routes/server.routes');
const statsRoutes = require('./routes/stats.routes');
const adminRoutes = require('./routes/admin.routes');
const aiRoutes = require('./routes/ai.routes');
const gameRoutes = require('./routes/game.routes');
const planRoutes = require('./routes/plan.routes');
const firewallRoutes = require('./routes/firewall.routes');
const notificationRoutes = require('./routes/notification.routes');

// Services
const { checkExpiredKeys } = require('./services/key.service');
const { syncFirewallRules } = require('./services/firewall_v2.service');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// === WebSocket Server ===
const wss = new WebSocketServer({ server, path: '/ws' });
app.set('wss', wss);

wss.on('connection', (ws, req) => {
    console.log('[WS] Client connected');
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            if (data.type === 'auth' && data.token) {
                ws.authenticated = true;
                ws.send(JSON.stringify({ type: 'auth_ok' }));
            } else if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (_) {}
    });

    ws.on('close', () => console.log('[WS] Client disconnected'));
});

const wsHeartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// Broadcast function
app.set('broadcast', (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(data));
        }
    });
});

// === Middleware ===
app.use(helmet());
app.use(cors());
app.use(express.json());

// === Rate Limiting ===
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { error: 'Quá nhiều request. Vui lòng thử lại sau.' }
});
app.use('/api/', limiter);

// === Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/firewall', firewallRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        name: 'NRO Shield API',
        version: '2.0.0',
        uptime: process.uptime()
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint không tồn tại' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
});

// === Cron Jobs ===
// Kiểm tra key hết hạn mỗi phút
cron.schedule('* * * * *', async () => {
    try {
        await checkExpiredKeys();
    } catch (err) {
        console.error('[CRON] Check expired keys error:', err.message);
    }
});

// Sync firewall rules mỗi 5 phút
cron.schedule('*/5 * * * *', async () => {
    try {
        await syncFirewallRules();
    } catch (err) {
        console.error('[CRON] Sync firewall error:', err.message);
    }
});

// Broadcast Real-time /var/log/nroshield/traffic/current_metrics.json mỗi 5s
const fs = require('fs');
setInterval(() => {
    try {
        if (fs.existsSync('/var/log/nroshield/traffic/current_metrics.json')) {
            const data = fs.readFileSync('/var/log/nroshield/traffic/current_metrics.json', 'utf8');
            const metrics = JSON.parse(data);
            app.get('broadcast')({ type: 'TRAFFIC_METRICS', data: metrics });
        }
    } catch (err) {
        // Ignore read errors (e.g., file being written)
    }
}, 5000);

// === Start Server ===
const PORT = config.API_PORT || 5000;

async function start() {
    try {
        // Test DB connection
        await db.query('SELECT 1');
        console.log('[DB] MySQL connected');

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`[NRO Shield] API running on port ${PORT}`);
            console.log(`[NRO Shield] WebSocket on ws://0.0.0.0:${PORT}/ws`);
            syncFirewallRules();
        });
    } catch (err) {
        console.error('[FATAL] Cannot start server:', err.message);
        process.exit(1);
    }
}

start();

module.exports = app;
