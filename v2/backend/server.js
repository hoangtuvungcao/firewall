require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { WebSocketServer } = require('ws');
const ShieldAI = require('./services/ai_analyzer.service');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// WebSocket Logic
wss.on('connection', (ws) => {
    console.log('[V2-WS] Client connected');
    ws.send(JSON.stringify({ type: 'WELCOME', message: 'NRO Shield v2 API' }));
});

// Basic Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0.0-gold' });
});

// Start Server
const PORT = process.env.PORT || 5050; // Dùng port khác bản cũ
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[NRO Shield v2] Running on port ${PORT}`);

    // Khởi chạy AI Shield
    ShieldAI.start();
});
