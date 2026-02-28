/**
 * MESH REGISTRY: DISCOVERY API
 * Trả về danh sách đồng minh cho một Cluster cụ thể
 */

module.exports = (req, res) => {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'Cluster key required' });

    // Lấy dữ liệu từ Global Registry (Trong thực tế dùng Redis)
    // TRONG MÔI TRƯỜNG SERVERLESS: Bạn CẦN kết nối Redis ở đây.

    const mockPeers = []; // Trả về mẫu nếu chưa có Redis

    res.status(200).json({
        peers: mockPeers,
        note: "Vui lòng kết nối Upstash/Redis trên Vercel để lưu trữ danh sách Peer thực tế."
    });
};
