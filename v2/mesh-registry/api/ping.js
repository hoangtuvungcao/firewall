/**
 * MESH REGISTRY: PING SINK
 * Lưu trữ tạm thời trạng thái các Node đang Online
 * Vì Vercel Serverless là stateless, trong thực tế nên dùng Redis (Upstash)
 * Bản MVP này dùng một Registry Object đơn giản (chỉ tồn tại trong vòng đời instance)
 */

let registry = {}; // { clusterKey: [ { ip, port, ts } ] }

module.exports = (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { ip, key, port } = req.body;
    if (!ip || !key) return res.status(400).send('Missing data');

    if (!registry[key]) registry[key] = [];

    // Update hoặc Add mới
    const index = registry[key].findIndex(p => p.ip === ip);
    const now = Date.now();

    if (index > -1) {
        registry[key][index].ts = now;
        registry[key][index].port = port;
    } else {
        registry[key].push({ ip, port, ts: now });
    }

    // Dọn dẹp các node offline > 2 phút
    registry[key] = registry[key].filter(p => now - p.ts < 120000);

    res.status(200).json({ success: true, message: 'Node registered' });
};

// Lưu ý: Để chạy ổn định lâu dài trên Vercel, bạn hãy cài add-on Redis (KV) 
// của Vercel và sửa code này sang dùng redis.set/get.
