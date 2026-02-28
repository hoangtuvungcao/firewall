require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { WebSocketServer } = require('ws');
const ShieldAI = require('./services/ai_analyzer.service');
const SmartGeofence = require('./services/smart_geofence.service');
const SystemService = require('./services/system.service');
const SAMPService = require('./services/samp.service');
const FirewallService = require('./services/firewall.service');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Global broadcast function for services
global.broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(data));
        }
    });
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// WebSocket Logic
wss.on('connection', (ws) => {
    console.log('[V2-WS] Client connected');
    ws.send(JSON.stringify({ type: 'WELCOME', message: 'NRO Shield v2 API' }));

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'SET_GEOFENCE_MODE') {
                await SmartGeofence.setMode(data.mode);
                // Gửi lại trạng thái ngay lập tức
                SmartGeofence.broadcastStatus();
            } else if (data.type === 'SERVER_ACTION') {
                if (data.action === 'flush_iptables') {
                    await FirewallService.reloadFirewall();
                } else {
                    await SystemService.controlServer(data.action);
                }
            }
        } catch (e) {
            console.error('[V2-WS] Message Error:', e.message);
        }
    });
});

// Basic Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0.0-gold' });
});

// Start Server
const PORT = process.env.PORT || 5050; // Dùng port khác bản cũ
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[NRO Shield v2] Running on port ${PORT}`);

    // Khởi chạy các dịch vụ
    ShieldAI.start();
    SmartGeofence.start();
    SystemService.start();
    SAMPService.start();
});
