const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Firewall Service v2 - Direct Shell Interaction
 */
const FirewallService = {
    /**
     * Thêm IP vào whitelist
     */
    async whitelistIp(ip) {
        try {
            await execAsync(`ipset add nroshield-whitelist ${ip} 2>/dev/null || true`);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    /**
     * Chặn IP (Blacklist)
     */
    async blacklistIp(ip, timeout = 86400) {
        try {
            await execAsync(`ipset add nroshield-blacklist ${ip} timeout ${timeout} 2>/dev/null || true`);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    /**
     * Lấy danh sách IP bị chặn
     */
    async getBlacklist() {
        try {
            const { stdout } = await execAsync('ipset list nroshield-blacklist');
            // Parse logic here if needed
            return { success: true, data: stdout };
        } catch (err) {
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
