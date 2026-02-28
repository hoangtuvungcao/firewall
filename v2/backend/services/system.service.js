const os = require('os-utils');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * SYSTEM MONITOR SERVICE
 * Thu thập chỉ số tài nguyên máy chủ thời gian thực
 */
const SystemService = {
    stats: {
        cpu: 0,
        mem: 0,
        disk: 0,
        uptime: 0,
        netIn: 0, // Bps (Bytes per second)
        netOut: 0
    },

    lastNet: { in: 0, out: 0, ts: 0 },

    start() {
        console.log('[SYSTEM-SERVICE] Metrics collection started.');
        setInterval(() => this.updateMetrics(), 5000);
    },

    async updateMetrics() {
        // 1. CPU Usage
        os.cpuUsage((v) => {
            this.stats.cpu = (v * 100).toFixed(1);
        });

        // 2. Memory Usage
        this.stats.mem = ((1 - os.freememPercentage()) * 100).toFixed(1);

        // 3. Uptime
        this.stats.uptime = Math.floor(os.sysUptime() / 3600); // Giờ

        // 4. Disk Usage (Lấy ổ root /)
        try {
            const { stdout } = await execAsync("df / | tail -1 | awk '{print $5}' | sed 's/%//'");
            this.stats.disk = stdout.trim();
        } catch (e) {
            this.stats.disk = 0;
        }

        // 5. Network Bitrate (bps)
        try {
            const { stdout } = await execAsync("cat /proc/net/dev | grep eth0 | awk '{print $2, $10}'");
            const [bytesIn, bytesOut] = stdout.trim().split(' ').map(Number);
            const now = Date.now();

            if (this.lastNet.ts > 0) {
                const diffTs = (now - this.lastNet.ts) / 1000;
                this.stats.netIn = Math.round(((bytesIn - this.lastNet.in) * 8) / diffTs); // bits per second
                this.stats.netOut = Math.round(((bytesOut - this.lastNet.out) * 8) / diffTs);
            }

            this.lastNet = { in: bytesIn, out: bytesOut, ts: now };
        } catch (e) {
            // Skip net monitor if eth0 not found
        }

        // Broadcast cho Frontend
        if (global.broadcast) {
            global.broadcast({ type: 'SYSTEM_STATS', data: this.stats });
        }
    },

    /**
     * Điều khiển Server (Mẫu)
     */
    async controlServer(action) {
        console.log(`[SYSTEM-SERVICE] Server Control Action: ${action}`);
        // Giả sử server chạy bằng systemd hoặc script
        // action: start, stop, restart
        try {
            // Ví dụ: sudo systemctl restart samp
            // await execAsync(`sudo systemctl ${action} samp`);
            return { success: true, message: `Action ${action} executed.` };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }
};

module.exports = SystemService;
