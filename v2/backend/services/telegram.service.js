const axios = require('axios');

/**
 * TELEGRAM ALERT SERVICE
 * Gửi thông báo trực tiếp về điện thoại khi có tấn công
 */
const TelegramService = {
    config: {
        enabled: process.env.TELEGRAM_ENABLED === 'true',
        token: process.env.TELEGRAM_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
    },

    async sendAlert(message) {
        if (!this.config.enabled || !this.config.token || !this.config.chatId) return;

        const url = `https://api.telegram.org/bot${this.config.token}/sendMessage`;
        try {
            await axios.post(url, {
                chat_id: this.config.chatId,
                text: `🚨 [SAMP SHIELD APEX] 🚨\n\n${message}`,
                parse_mode: 'HTML'
            });
        } catch (e) {
            console.error('[TELEGRAM-SERVICE] Error:', e.message);
        }
    },

    async logAttack(data) {
        const msg = `<b>TẤN CÔNG MỚI ĐƯỢC PHÁT HIỆN!</b>\n\n` +
            `📍 IP: <code>${data.ip}</code>\n` +
            `🏷 Loại: ${data.type}\n` +
            `📊 Cường độ: ${data.pps} PPS\n` +
            `🔴 Mức độ: ${data.severity}\n` +
            `🛡 Hành động: ${data.action || 'ĐÃ CHẶN'}`;
        await this.sendAlert(msg);
    }
};

module.exports = TelegramService;
