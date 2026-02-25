require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Bot, InlineKeyboard, session } = require('grammy');
const axios = require('axios');

const API_URL = `http://127.0.0.1:${process.env.API_PORT || 5000}`;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.log('[BOT] TELEGRAM_BOT_TOKEN chưa cấu hình trong .env');
    process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// Session storage
bot.use(session({ initial: () => ({ token: null, step: null, data: {} }) }));

// === Helper ===
async function apiCall(method, endpoint, data = null, token = null) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = `${API_URL}${endpoint}`;
        const config = {
            method: method.toLowerCase(),
            url,
            headers,
            data,
            timeout: 10000
        };

        const res = await axios(config);
        return res.data;
    } catch (err) {
        return { error: err.response?.data?.error || err.message };
    }
}

// === /start ===
bot.command('start', async (ctx) => {
    const kb = new InlineKeyboard()
        .text('🔑 Đăng nhập', 'login')
        .text('📝 Đăng ký', 'register').row()
        .text('📊 Trạng thái', 'status')
        .text('❓ Hướng dẫn', 'help');

    await ctx.reply(
        `🛡️ *NRO Shield Bot*\n\nChào ${ctx.from.first_name}! Tôi là bot quản lý NRO Shield.\n\nChọn một tùy chọn:`,
        { parse_mode: 'Markdown', reply_markup: kb }
    );
});

// === /help ===
bot.command('help', async (ctx) => {
    await ctx.reply(
        `📖 *Hướng dẫn sử dụng*\n\n` +
        `1️⃣ Đăng ký tài khoản với key\n` +
        `2️⃣ Thêm server game (nhập IP thật)\n` +
        `3️⃣ Tạo proxy port → nhận IP Shield\n` +
        `4️⃣ Game kết nối qua IP Shield\n\n` +
        `*Lệnh:*\n` +
        `/login - Đăng nhập\n` +
        `/servers - Danh sách server\n` +
        `/proxies - Danh sách proxy\n` +
        `/addserver - Thêm server mới\n` +
        `/delserver - Xóa server\n` +
        `/addproxy - Tạo proxy mới\n` +
        `/stats - Xem thống kê\n` +
        `/attacks - Xem tấn công gần đây`,
        { parse_mode: 'Markdown' }
    );
});

// === /login ===
bot.command('login', async (ctx) => {
    ctx.session.step = 'login_username';
    await ctx.reply('👤 Nhập username:');
});

// === /addserver ===
bot.command('addserver', async (ctx) => {
    if (!ctx.session.token) return ctx.reply('❌ Đăng nhập trước: /login');
    ctx.session.step = 'add_server_name';
    await ctx.reply('📛 Nhập tên server (ví dụ: NRO Server 1):');
});

// === /delserver ===
bot.command('delserver', async (ctx) => {
    if (!ctx.session.token) return ctx.reply('❌ Đăng nhập trước: /login');
    const data = await apiCall('get', '/api/servers', null, ctx.session.token);
    if (data.error) return ctx.reply('❌ ' + data.error);
    if (!data.length) return ctx.reply('📭 Bạn chưa có server nào.');

    const kb = new InlineKeyboard();
    let msg = '🗑️ *Chọn server muốn xóa:*\n\n';
    data.forEach(s => {
        msg += `• *${s.name}* (${s.target_ip})\n`;
        kb.text(`🗑️ Xóa ${s.name}`, `confirm_del_srv_${s.id}`).row();
    });

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb });
});

// === /addproxy ===
bot.command('addproxy', async (ctx) => {
    if (!ctx.session.token) return ctx.reply('❌ Đăng nhập trước: /login');
    ctx.session.step = 'add_proxy_server';

    const data = await apiCall('get', '/api/servers', null, ctx.session.token);
    if (data.error) return ctx.reply('❌ ' + data.error);
    if (!Array.isArray(data) || !data.length) return ctx.reply('❌ Chưa có server. Dùng /addserver');

    let msg = '🖥️ *Chọn server:*\n\n';
    const kb = new InlineKeyboard();
    data.forEach((s) => {
        msg += `ID ${s.id}: ${s.name} (${s.target_ip})\n`;
        kb.text(`${s.id}: ${s.name}`, `select_server_${s.id}`).row();
    });

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb });
});

// === /servers ===
bot.command('servers', async (ctx) => {
    if (!ctx.session.token) return ctx.reply('❌ /login trước');
    const data = await apiCall('get', '/api/servers', null, ctx.session.token);
    if (data.error) return ctx.reply('❌ ' + data.error);
    if (!data.length) return ctx.reply('📭 Chưa có server. Dùng /addserver');

    let msg = '🖥️ *Danh sách server:*\n\n';
    data.forEach(s => { msg += `• *${s.name}* — ${s.target_ip} (${s.port_count || 0} ports)\n`; });
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// === /proxies ===
bot.command('proxies', async (ctx) => {
    if (!ctx.session.token) return ctx.reply('❌ /login trước');
    const data = await apiCall('get', '/api/proxy', null, ctx.session.token);
    if (data.error) return ctx.reply('❌ ' + data.error);
    if (!data.length) return ctx.reply('📭 Chưa có proxy. Dùng /addproxy');

    let msg = '🔀 *Danh sách proxy:*\n\n';
    data.forEach(p => {
        const status = p.is_active ? '🟢' : '🔴';
        msg += `${status} \`${p.proxy_address}\` → ${p.target_address} (${p.protocol})\n`;
    });
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// === /stats ===
bot.command('stats', async (ctx) => {
    if (!ctx.session.token) return ctx.reply('❌ /login trước');
    const data = await apiCall('get', '/api/stats/summary', null, ctx.session.token);
    if (data.error) return ctx.reply('❌ ' + data.error);

    await ctx.reply(
        `📊 *Dashboard*\n\n` +
        `🖥️ Servers: ${data.total_servers}\n` +
        `🔀 Ports: ${data.active_ports}/${data.total_ports}\n` +
        `⚡ Attacks today: ${data.attacks_today}`,
        { parse_mode: 'Markdown' }
    );
});

// === /attacks ===
bot.command('attacks', async (ctx) => {
    if (!ctx.session.token) return ctx.reply('❌ /login trước');
    const data = await apiCall('get', '/api/stats/attacks?limit=5', null, ctx.session.token);
    if (data.error) return ctx.reply('❌ ' + data.error);
    if (!data.length) return ctx.reply('✅ Chưa có tấn công nào!');

    let msg = '🚨 *Tấn công gần đây:*\n\n';
    data.forEach(a => {
        msg += `• ${a.attack_type} — ${a.attacker_ip} (${a.packets_blocked} pkts)\n`;
    });
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// === Callback queries ===
bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data === 'login') {
        ctx.session.step = 'login_username';
        await ctx.reply('👤 Nhập username:');
    } else if (data === 'register') {
        ctx.session.step = 'register_username';
        await ctx.reply('👤 Nhập username mới:');
    } else if (data === 'status') {
        await ctx.reply('Dùng /stats để xem thống kê');
    } else if (data === 'help') {
        await ctx.reply('Dùng /help để xem hướng dẫn');
    } else if (data.startsWith('select_server_')) {
        const serverId = data.replace('select_server_', '');
        ctx.session.data.server_id = parseInt(serverId);
        ctx.session.step = 'add_proxy_port';
        await ctx.reply('🔢 Nhập port game cần bảo vệ (ví dụ: 14445):');
    } else if (data.startsWith('confirm_del_srv_')) {
        const serverId = data.replace('confirm_del_srv_', '');
        const res = await apiCall('delete', `/api/servers/${serverId}`, {}, ctx.session.token);
        if (res.error) {
            await ctx.reply('❌ Lỗi: ' + res.error);
        } else {
            await ctx.reply('✅ Đã xóa server và các proxy liên quan.');
        }
    } else if (data.startsWith('toggle_')) {
        const proxyId = data.replace('toggle_', '');
        const res = await apiCall('put', `/api/proxy/${proxyId}/toggle`, {}, ctx.session.token);
        await ctx.reply(res.error ? '❌ ' + res.error : `✅ ${res.message}`);
    }

    await ctx.answerCallbackQuery();
});

// === Message handler (multi-step flows) ===
bot.on('message:text', async (ctx) => {
    const step = ctx.session.step;
    const text = ctx.message.text;

    if (!step) return;

    // Login flow
    if (step === 'login_username') {
        ctx.session.data.username = text;
        ctx.session.step = 'login_password';
        await ctx.reply('🔒 Nhập password:');

    } else if (step === 'login_password') {
        const res = await apiCall('post', '/api/auth/login', {
            username: ctx.session.data.username,
            password: text
        });
        ctx.session.step = null;

        if (res.error) {
            await ctx.reply('❌ ' + res.error);
        } else {
            ctx.session.token = res.token;
            await ctx.reply(`✅ Đăng nhập thành công! Xin chào *${res.user.username}*\n\nDùng /help để xem lệnh.`,
                { parse_mode: 'Markdown' });
        }

        // Register flow
    } else if (step === 'register_username') {
        ctx.session.data.username = text;
        ctx.session.step = 'register_password';
        await ctx.reply('🔒 Nhập password:');

    } else if (step === 'register_password') {
        ctx.session.data.password = text;
        ctx.session.step = 'register_key';
        await ctx.reply('🔑 Nhập key license (ví dụ: NRO-XXXX...):');

    } else if (step === 'register_key') {
        const res = await apiCall('post', '/api/auth/register', {
            username: ctx.session.data.username,
            password: ctx.session.data.password,
            key_code: text,
            telegram_id: ctx.from.id
        });
        ctx.session.step = null;

        if (res.error) {
            await ctx.reply('❌ ' + res.error);
        } else {
            ctx.session.token = res.token;
            await ctx.reply(`✅ Đăng ký thành công! Chào *${res.user.username}*\n\nDùng /addserver để thêm server game.`,
                { parse_mode: 'Markdown' });
        }

        // Add server flow
    } else if (step === 'add_server_name') {
        ctx.session.data.server_name = text;
        ctx.session.step = 'add_server_ip';
        await ctx.reply('🌐 Nhập IP server game (ví dụ: 103.77.246.157):');

    } else if (step === 'add_server_ip') {
        const res = await apiCall('post', '/api/servers', {
            name: ctx.session.data.server_name,
            target_ip: text
        }, ctx.session.token);
        ctx.session.step = null;

        if (res.error) {
            await ctx.reply('❌ ' + res.error);
        } else {
            await ctx.reply(`✅ Server "${res.server.name}" (${res.server.target_ip}) đã thêm!\n\nDùng /addproxy để tạo proxy.`);
        }

        // Add proxy flow
    } else if (step === 'add_proxy_port') {
        const port = parseInt(text);
        if (isNaN(port) || port < 1 || port > 65535) {
            return ctx.reply('❌ Port phải từ 1-65535');
        }

        const res = await apiCall('post', '/api/proxy/create', {
            server_id: ctx.session.data.server_id,
            target_port: port
        }, ctx.session.token);
        ctx.session.step = null;

        if (res.error) {
            await ctx.reply('❌ ' + res.error);
        } else {
            await ctx.reply(
                `✅ *Proxy đã tạo!*\n\n` +
                `📥 Kết nối game qua: \`${res.proxy.proxy_address}\`\n` +
                `📤 Forward tới: ${res.proxy.target_address}\n` +
                `📡 Protocol: ${res.proxy.protocol}\n\n` +
                `_Thay IP server game bằng IP trên để chơi qua Shield_`,
                { parse_mode: 'Markdown' }
            );
        }
    }
});

// Error handler
bot.catch((err) => {
    console.error('[BOT] Error:', err.message);
});

// Start
bot.start();
console.log('[NRO Shield Bot] Started');
