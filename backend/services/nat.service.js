const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Thêm NAT rule (DNAT + SNAT) cho proxy port
 */
async function addNatRule(proxyPort, targetIp, targetPort, protocol = 'tcp') {
    try {
        // Validate inputs chống injection
        if (!/^\d+$/.test(String(proxyPort)) || !/^\d+$/.test(String(targetPort))) {
            return { success: false, error: 'Port không hợp lệ' };
        }
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(targetIp)) {
            return { success: false, error: 'IP không hợp lệ' };
        }

        const proto = protocol === 'both' ? ['tcp', 'udp'] : [protocol];

        for (const p of proto) {
            // DNAT: redirect incoming traffic tới target
            await execAsync(
                `iptables -t nat -A PREROUTING -p ${p} --dport ${proxyPort} -j DNAT --to-destination ${targetIp}:${targetPort}`
            );

            // Allow FORWARD cho traffic này (nếu target là external server)
            await execAsync(
                `iptables -A FORWARD -p ${p} -d ${targetIp} --dport ${targetPort} -m conntrack --ctstate NEW -j ACCEPT`
            );

            // Allow INPUT cho traffic này (nếu target là chính VPS này để test/chạy game cục bộ)
            await execAsync(
                `iptables -A INPUT -p ${p} -d ${targetIp} --dport ${targetPort} -m conntrack --ctstate NEW -j ACCEPT`
            );

            // MASQUERADE (SNAT): Đảm bảo traffic quay về Shield VPS
            await execAsync(
                `iptables -t nat -A POSTROUTING -p ${p} -d ${targetIp} --dport ${targetPort} -j MASQUERADE`
            );
        }

        // Lưu rules
        await execAsync('iptables-save > /etc/iptables/rules.v4 2>/dev/null || true');

        console.log(`[NAT] Added: :${proxyPort} → ${targetIp}:${targetPort} (${protocol})`);
        return { success: true };
    } catch (err) {
        console.error('[NAT] Add error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Xóa NAT rule
 */
async function removeNatRule(proxyPort, targetIp, targetPort, protocol = 'tcp') {
    try {
        const proto = protocol === 'both' ? ['tcp', 'udp'] : [protocol];

        for (const p of proto) {
            await execAsync(
                `iptables -t nat -D PREROUTING -p ${p} --dport ${proxyPort} -j DNAT --to-destination ${targetIp}:${targetPort} 2>/dev/null || true`
            );
            await execAsync(
                `iptables -D FORWARD -p ${p} -d ${targetIp} --dport ${targetPort} -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null || true`
            );
            await execAsync(
                `iptables -D INPUT -p ${p} -d ${targetIp} --dport ${targetPort} -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null || true`
            );
            await execAsync(
                `iptables -t nat -D POSTROUTING -p ${p} -d ${targetIp} --dport ${targetPort} -j MASQUERADE 2>/dev/null || true`
            );
        }

        await execAsync('iptables-save > /etc/iptables/rules.v4 2>/dev/null || true');

        console.log(`[NAT] Removed: :${proxyPort} → ${targetIp}:${targetPort}`);
        return { success: true };
    } catch (err) {
        console.error('[NAT] Remove error:', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { addNatRule, removeNatRule };
