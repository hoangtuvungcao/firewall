#!/bin/bash

# ==========================================================
# NRO SHIELD ENTERPRISE - RAW TABLE HARDENING
# Chống Flood tại tầng cao nhất của IPTables (Bypassing Conntrack)
# ==========================================================

GAME_PORT=7777

echo "[INFO] Đang tối ưu hóa bảng RAW cho hiệu suất tối đa..."

# 1. Chống UDP Flood cực đoan (Lọc gói tin không phải Data chuẩn)
# Các gói tin quá nhỏ hoặc quá lớn bất thường sẽ bị loại bỏ ngay lập tức
iptables -t raw -A PREROUTING -p udp --dport $GAME_PORT -m length --length 0:19 -j DROP
iptables -t raw -A PREROUTING -p udp --dport $GAME_PORT -m length --length 1492:65535 -j DROP

# 2. Chặn các Fragmented packets (Không cho phép chia nhỏ gói tin UDP)
iptables -t raw -A PREROUTING -p udp -m fragment -j DROP

# 3. Rate Limit tại tầng RAW (Không tốn tài nguyên tracking)
iptables -t raw -A PREROUTING -p udp --dport $GAME_PORT -m hashlimit --hashlimit-name raw_udp --hashlimit-mode srcip --hashlimit-upto 500/sec --hashlimit-burst 1000 -j ACCEPT
iptables -t raw -A PREROUTING -p udp --dport $GAME_PORT -j DROP

# 4. Tối ưu Kernel cho 10Gbps+ Port
sysctl -w net.core.netdev_max_backlog=100000
sysctl -w net.core.somaxconn=10000
sysctl -w net.ipv4.udp_rmem_min=16384

echo "[OK] RAW Layer đã được gia cố!"
