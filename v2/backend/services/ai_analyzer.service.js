const FirewallService = require('./firewall.service');
const SmartGeofence = require('./smart_geofence.service');
const AttackLogLogService = require('./attack_log.service');

/**
 * SHIELD AI v2 - Behavioral Analysis Engine
 * Chuyên trách phân tích và ra quyết định chặn IP tự động
 */
const ShieldAI = {
    // Cấu hình ngưỡng nhạy cảm
    configs: {
        analysisInterval: 2000,
        maxPacketsPerInterval: process.env.MAX_PPS_PER_IP || 100,
        maxQueriesPerSecond: process.env.MAX_QUERIES_PER_IP || 5,
        port: process.env.SAMP_PORT || 7777
    },

    state: {
        ipStats: new Map(), // Lưu trữ tạm thời stats của các IP
    },

    /**
   * Khởi chạy trình theo dõi AI
   */
    start() {
        console.log('[SHIELD-AI] Engine started. Realtime XDP Sync enabled.');

        // Khởi tạo map cho XDP nếu có tool bpftool
        exec('bpftool map show name blacklist_map', (err) => {
            if (err) console.warn('[SHIELD-AI] XDP Map not found. Falling back to IPSet.');
        });

        const monitorCmd = `tcpdump -n -i any -l "udp port 7777"`;
        const monitorProcess = exec(monitorCmd);

        monitorProcess.stdout.on('data', (data) => {
            this.processLine(data.toString());
        });

        // Định kỳ phân tích để đưa ra quyết định "Chặn"
        setInterval(() => this.analyzeHebbBehavior(), this.configs.analysisInterval);
    },

    /**
     * Xử lý từng dòng log traffic
     */
    processLine(line) {
        try {
            // Logic phân tích IP từ text tcpdump
            // Ví dụ: 20:30:05.123 IP 1.2.3.4.5678 > 103.77.246.150.7777: UDP, length 546
            const match = line.match(/IP ([\d\.]+)\.\d+ > [\d\.]+\.7777: UDP, length (\d+)/);
            if (match) {
                const ip = match[1];
                const length = parseInt(match[2]);

                if (!this.state.ipStats.has(ip)) {
                    this.state.ipStats.set(ip, { count: 0, sizes: [], lastTime: Date.now() });
                }

                const stats = this.state.ipStats.get(ip);
                stats.count++;
                stats.sizes.push(length);
            }
        } catch (e) {
            // Ignore parse errors
        }
    },

    /**
   * Giải thuật Heuristic: Phân tích hành vi tích lũy
   */
    async analyzeHebbBehavior() {
        const now = Date.now();
        let totalPPS = 0;

        for (const [ip, stats] of this.state.ipStats) {
            // Tính toán PPS tổng cho Geofencing
            totalPPS += stats.count;

            // 1. Nhận diện Handshake Flood (RakNet 546 bytes)
            const handshakePackets = stats.sizes.filter(s => s === 546).length;
            if (handshakePackets > this.configs.maxHandshakesPerSecond) {
                console.warn(`[SHIELD-AI] ALERT: Handshake Flood from ${ip}. Pushing to XDP Driver Layer.`);

                // PUSH THẲNG VÀO XDP MAP (Bypass Kernel hoàn toàn cho tương lai)
                exec(`bpftool map update name blacklist_map key hex ${this.ipToHex(ip)} value hex 01`);

                // LƯU VÀO DATABASE
                await AttackLogLogService.log({
                    ip,
                    type: 'RAKNET_HANDSHAKE_FLOOD',
                    pps: Math.round(handshakePackets / (this.configs.analysisInterval / 1000)),
                    severity: 'HIGH'
                });

                await FirewallService.blacklistIp(ip, 7200);
                this.state.ipStats.delete(ip);
                continue;
            }

            // 2. Nhận diện Query Spam (Packet nhỏ < 20 bytes)
            const queryPackets = stats.sizes.filter(s => s < 20).length;
            if (queryPackets > this.configs.maxQueriesPerSecond) {
                console.warn(`[SHIELD-AI] ALERT: Query Spam detected from ${ip}. Blocking...`);

                // LƯU VÀO DATABASE
                await AttackLogLogService.log({
                    ip,
                    type: 'SAMP_QUERY_FLOOD',
                    pps: Math.round(queryPackets / (this.configs.analysisInterval / 1000)),
                    severity: 'MEDIUM'
                });

                await FirewallService.blacklistIp(ip, 3600); // Chặn 1 tiếng
                this.state.ipStats.delete(ip);
                continue;
            }

            // Cleanup các IP đã lâu không hoạt động
            if (now - stats.lastTime > 60000) {
                this.state.ipStats.delete(ip);
            }
        }

        // Gửi PPS tổng sang Smart Geofence để tự động bóp/mở quốc tế
        const averagePPS = totalPPS / (this.configs.analysisInterval / 1000);
        SmartGeofence.updateMetrics(averagePPS);

        // Reset counters cho lần sau
        for (const [ip, stats] of this.state.ipStats) {
            stats.count = 0;
            stats.sizes = [];
        }
    },

    /**
     * Chuyển IP sang Hex để dùng cho bpftool
     */
    ipToHex(ip) {
        const parts = ip.split('.').map(p => parseInt(p).toString(16).padStart(2, '0'));
        // network byte order (little endian for x86)
        return parts.reverse().join(' ');
    }
};

module.exports = ShieldAI;
