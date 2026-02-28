const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
require('dotenv').config();

/**
 * FIREWALL SERVICE v2 - APEX EDITION
 * Quản lý iptables, ipset và cấu hình hệ thống chuyên sâu cho SA:MP
 */
const FirewallService = {
    configs: {
        port: process.env.SAMP_PORT || 7777,
        blockDuration: process.env.BLOCK_DURATION || 3600,
        whitelistDuration: process.env.WHITELIST_DURATION || 86400
    },

    async init() {
        console.log('[FIREWALL] Initializing Apex Firewall Rules...');
        try {
            // Đảm bảo ipset tồn tại
            await execAsync('ipset create -exist nroshield-blacklist hash:ip timeout 0');
            await execAsync('ipset create -exist nroshield-whitelist hash:ip timeout 0');

            // Load XDP Program (Nếu có file object)
            try {
                await execAsync('ip link set dev eth0 xdp off'); // Flush cũ
                await execAsync('ip link set dev eth0 xdp obj firewall/xdp_samp.o sec xdp_samp');
                console.log('[FIREWALL] XDP SAMP Protocol Scrubbing Loaded.');
            } catch (xdpErr) {
                console.warn('[FIREWALL] XDP Load Warning:', xdpErr.message);
            }

            // Áp dụng rules cơ bản
            await this.applyBaseRules();
        } catch (err) {
            console.error('[FIREWALL] Initialization Error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Reload toàn bộ firewall v2
     */
    async reloadFirewall() {
        try {
            await execAsync('bash /opt/nroshield/v2/firewall/local_firewall_v2.sh');
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};

module.exports = FirewallService;
