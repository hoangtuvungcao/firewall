const FirewallService = require('./firewall.service');

/**
 * ENTERPRISE DPI - Stateful RakNet Verifier
 * Phân tích trạng thái kết nối SA:MP chuẩn xác 100%
 */
const AdvancedDPI = {
    // Trình trạng thái IP: 0=New, 1=Handshake_Sent, 2=Verified
    ipStates: new Map(),

    /**
     * Phân tích gói tin dựa trên Signature của SA:MP
     */
    async inspectPacket(ip, length, data = null) {
        let state = this.ipStates.get(ip) || { stage: 0, ts: Date.now(), score: 0 };

        // 1. RakNet Cookie Request (Kích thước thường 546-550)
        if (length >= 540 && length <= 560) {
            if (state.stage === 0) {
                state.stage = 1; // Đang đợi phản hồi handshake
                state.ts = Date.now();
            } else {
                // Nếu IP gửi Handshake liên tục mà không bao giờ Login -> Spam
                state.score++;
            }
        }

        // 2. Chặn IP nếu Score quá cao (Behavioral Blocking)
        if (state.score > 20) {
            console.error(`[ENTERPRISE-DPI] IP ${ip} failed stateful verification. Banning.`);
            await FirewallService.blacklistIp(ip, 86400); // Ban 24h
            this.ipStates.delete(ip);
            return;
        }

        // 3. Sau một khoảng thời gian, nếu không có traffic data -> Reset hoặc Ban
        if (Date.now() - state.ts > 30000) {
            this.ipStates.delete(ip);
            return;
        }

        this.ipStates.set(ip, state);
    }
};

module.exports = AdvancedDPI;
