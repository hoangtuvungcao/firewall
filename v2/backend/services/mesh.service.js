const axios = require('axios');
const WebSocket = require('ws');

/**
 * NRO MESH SERVICE
 * Tự động tìm kiếm đồng minh và chia sẻ trí tuệ tập thể
 */
const MeshService = {
    peers: new Map(), // ip -> ws
    config: {
        enabled: process.env.MESH_ENABLED === 'true',
        clusterKey: process.env.CLUSTER_KEY || 'GLOBAL',
        registry: process.env.MESH_REGISTRY_URL || 'https://api.nroshield.com/mesh',
        publicIp: process.env.VPS_PUBLIC_IP
    },

    async start() {
        if (!this.config.enabled) return;

        console.log(`[MESH] Starting Mesh Service (Cluster: ${this.config.clusterKey})`);

        // 1. Đăng ký lên Registry để "báo danh"
        await this.pingRegistry();

        // 2. Định kỳ cập nhật danh sách Peer
        setInterval(() => this.pingRegistry(), 60000); // 1p/lần
        setInterval(() => this.discoverPeers(), 30000); // 30s tìm peer mới
    },

    async pingRegistry() {
        try {
            await axios.post(this.config.registry, {
                ip: this.config.publicIp,
                key: this.config.clusterKey,
                port: process.env.PORT || 5050
            });
        } catch (e) {
            // console.error('[MESH] Registry Offline');
        }
    },

    async discoverPeers() {
        try {
            const { data } = await axios.get(`${this.config.registry}?key=${this.config.clusterKey}`);
            for (const peer of data.peers) {
                if (peer.ip !== this.config.publicIp && !this.peers.has(peer.ip)) {
                    this.connectToPeer(peer);
                }
            }
        } catch (e) {
            // console.error('[MESH] Discovery Error');
        }
    },

    connectToPeer(peer) {
        console.log(`[MESH] High-fiving peer: ${peer.ip}`);
        const ws = new WebSocket(`ws://${peer.ip}:${peer.port}/ws`);

        ws.on('open', () => {
            ws.send(JSON.stringify({
                type: 'MESH_HELLO',
                key: this.config.clusterKey,
                ip: this.config.publicIp
            }));
            this.peers.set(peer.ip, ws);
        });

        ws.on('message', (msg) => {
            const data = JSON.parse(msg);
            if (data.type === 'MESH_SYNC_IP') {
                this.handleIpSync(data);
            }
        });

        ws.on('close', () => this.peers.delete(peer.ip));
        ws.on('error', () => { });
    },

    /**
     * Chia sẻ IP xấu với tất cả "đồng minh"
     */
    broadcastAttack(ip, type) {
        if (!this.config.enabled) return;
        console.log(`[MESH] Broadcasting attack source ${ip} to peers...`);
        this.peers.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'MESH_SYNC_IP',
                    ip,
                    attackType: type,
                    source: this.config.publicIp
                }));
            }
        });
    },

    handleIpSync(data) {
        console.log(`[MESH] Intelligence received from ${data.source}: Chặn IP ${data.ip}`);
        const FirewallService = require('./firewall.service');
        FirewallService.blacklistIp(data.ip, 1800); // Tự động chặn theo đồng minh (30p)

        if (global.broadcast) {
            global.broadcast({
                type: 'SYSTEM_NOTIFICATION',
                message: `Đồng minh ${data.source} phát hiện tấn công từ ${data.ip}. Đã tự động chặn theo!`
            });
        }
    }
};

module.exports = MeshService;
