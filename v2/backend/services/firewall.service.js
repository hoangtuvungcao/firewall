const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
require('dotenv').config();

/**
 * FIREWALL SERVICE v2 - APEX EDITION
 * Quản lý iptables, ipset và cấu hình hệ thống chuyên sâu cho SA:MP
 */
const FirewallService = {

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
