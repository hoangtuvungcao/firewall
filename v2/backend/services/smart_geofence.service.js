const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * SMART GEOFENCE SERVICE
 * Tự động chặn quốc tế khi bị DDoS, mở lại sau 5 phút yên bình
 */
const SmartGeofence = {
    mode: 'AUTO', // AUTO, VN_ONLY, GLOBAL
    status: 'GLOBAL', // Hiện tại đang là GLOBAL hay VN_ONLY

    config: {
        ppsThreshold: 5000,      // Ngưỡng PPS để kích hoạt chặn quốc tế
        restoreTime: 5 * 60 * 1000, // 5 phút (300.000ms)
        checkInterval: 5000      // Kiểm tra mỗi 5s
    },

    lastDdosTime: 0,
    currentPPS: 0,

    /**
     * Khởi chạy service
     */
    async start() {
        console.log('[SMART-GEOFENCE] Starting in AUTO mode...');
        // Đảm bảo IPSet VN đã tồn tại (Chạy script geofencing.sh lúc khởi động)
        await execAsync('bash /home/vantrong/Downloads/github/firewall/v2/firewall/geofencing.sh || true');

        // Interval giám sát
        setInterval(() => this.tick(), this.config.checkInterval);
    },

    /**
     * Cập nhật PPS từ AI Shield hoặc Monitor
     */
    updateMetrics(pps) {
        this.currentPPS = pps;
    },

    /**
     * Logic kiểm tra trạng thái
     */
    async tick() {
        if (this.mode !== 'AUTO') return;

        const now = Date.now();

        // 1. Kiểm tra nếu PPS vượt ngưỡng -> Kích hoạt ngay lập tức
        if (this.currentPPS > this.config.ppsThreshold) {
            this.lastDdosTime = now;
            if (this.status === 'GLOBAL') {
                console.warn(`[SMART-GEOFENCE] DDoS Detected (${this.currentPPS} PPS)! Switching to VN_ONLY mode.`);
                await this.applyVnOnly();
            }
        }
        // 2. Nếu đang ở VN_ONLY và đã qua 5 phút không có DDoS -> Mở lại GLOBAL
        else if (this.status === 'VN_ONLY') {
            if (now - this.lastDdosTime > this.config.restoreTime) {
                console.log(`[SMART-GEOFENCE] System stable for 5 mins. Restoring GLOBAL access.`);
                await this.applyGlobal();
            }
        }
    },

    /**
     * Chặn quốc tế - Chỉ cho phép VN
     */
    async applyVnOnly() {
        try {
            // Xóa rule cũ nếu có
            await execAsync('iptables -t raw -D PREROUTING -p udp --dport 7777 -m set ! --match-set nroshield-geofence src -j DROP 2>/dev/null || true');
            // Thêm rule chặn quốc tế
            await execAsync('iptables -t raw -A PREROUTING -p udp --dport 7777 -m set ! --match-set nroshield-geofence src -j DROP');
            this.status = 'VN_ONLY';
            this.broadcastStatus();
        } catch (e) {
            console.error('[SMART-GEOFENCE] Error applying VN_ONLY:', e.message);
        }
    },

    /**
     * Mở lại quốc tế
     */
    async applyGlobal() {
        try {
            await execAsync('iptables -t raw -D PREROUTING -p udp --dport 7777 -m set ! --match-set nroshield-geofence src -j DROP 2>/dev/null || true');
            this.status = 'GLOBAL';
            this.broadcastStatus();
        } catch (e) {
            console.error('[SMART-GEOFENCE] Error applying GLOBAL:', e.message);
        }
    },

    /**
     * Đổi chế độ thủ công từ Panel
     */
    async setMode(newMode) {
        this.mode = newMode;
        if (newMode === 'VN_ONLY') await this.applyVnOnly();
        if (newMode === 'GLOBAL') await this.applyGlobal();
        console.log(`[SMART-GEOFENCE] Mode changed to: ${newMode}`);
    },

    broadcastStatus() {
        // Thông báo cho Frontend qua WebSocket (Sẽ gọi từ server.js)
        if (global.broadcast) {
            global.broadcast({
                type: 'GEOFENCE_STATUS',
                data: { mode: this.mode, status: this.status, lastDdos: this.lastDdosTime }
            });
        }
    }
};

module.exports = SmartGeofence;
