const query = require('node-samp-query');

/**
 * SA:MP SERVER QUERY SERVICE
 * Lấy thông tin trạng thái của Game Server
 */
const SAMPService = {
    options: {
        host: '127.0.0.1',
        port: 7777
    },

    serverInfo: {
        online: false,
        hostname: 'N/A',
        players: 0,
        maxplayers: 0,
        map: 'N/A',
        gamemode: 'N/A'
    },

    start() {
        console.log('[SAMP-SERVICE] Query loop started.');
        setInterval(() => this.updateInfo(), 10000); // 10s check 1 lần
    },

    updateInfo() {
        query(this.options, (err, response) => {
            if (err) {
                this.serverInfo.online = false;
            } else {
                this.serverInfo = {
                    online: true,
                    hostname: response.hostname,
                    players: response.online,
                    maxplayers: response.maxplayers,
                    map: response.mapname,
                    gamemode: response.gamemode
                };
            }

            // Broadcast cho Frontend
            if (global.broadcast) {
                global.broadcast({ type: 'SAMP_STATUS', data: this.serverInfo });
            }
        });
    }
};

module.exports = SAMPService;
