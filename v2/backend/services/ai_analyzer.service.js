const { exec } = require('child_process');
const FirewallService = require('./firewall.service');

/**
 * SHIELD AI v2 - Behavioral Analysis Engine
 * Chuyên trách phân tích và ra quyết định chặn IP tự động
 */
const ShieldAI = {
    // Cấu hình ngưỡng nhạy cảm
    configs: {
        maxHandshakesPerSecond: 10,
        maxQueriesPerSecond: 20,
        analysisInterval: 5000 // 5 giây phân tích 1 lần
    },

    state: {
        ipStats: new Map(), // Lưu trữ tạm thời stats của các IP
    },

    /**
     * Khởi chạy trình theo dõi AI
     */
    start() {
        console.log('[SHIELD-AI] Engine started and monitoring patterns...');

        // Sử dụng tcpdump để "ngửi" gói tin thô (chỉ lấy header để tiết kiệm CPU)
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
        for (const [ip, stats] of this.state.ipStats) {

            // 1. Nhận diện Handshake Flood (RakNet 546 bytes)
            const handshakePackets = stats.sizes.filter(s => s === 546).length;
            if (handshakePackets > this.configs.maxHandshakesPerSecond) {
                console.warn(`[SHIELD-AI] ALERT: Handshake Flood detected from ${ip}. Blocking...`);
                await FirewallService.blacklistIp(ip, 7200); // Chặn 2 tiếng
                this.state.ipStats.delete(ip);
                continue;
            }

            // 2. Nhận diện Query Spam (Packet nhỏ < 20 bytes)
            const queryPackets = stats.sizes.filter(s => s < 20).length;
            if (queryPackets > this.configs.maxQueriesPerSecond) {
                console.warn(`[SHIELD-AI] ALERT: Query Spam detected from ${ip}. Blocking...`);
                await FirewallService.blacklistIp(ip, 3600); // Chặn 1 tiếng
                this.state.ipStats.delete(ip);
                continue;
            }

            // Cleanup các IP đã lâu không hoạt động
            if (now - stats.lastTime > 60000) {
                this.state.ipStats.delete(ip);
            }
        }
    }
};

module.exports = ShieldAI;
