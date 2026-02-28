#!/bin/bash

# ==========================================================
# NRO SHIELD LOCAL ULTIMATE v2 - DIRECT PROTECTION
# Optimized for SA:MP on Ubuntu 22.04 (No Proxy)
# ==========================================================

# Configuration
GAME_PORT=7777
MAX_CONN_PER_IP=100
QUERY_LIMIT="5/sec"
QUERY_BURST=10

echo "[INFO] Khởi tạo NRO Shield Local v2..."

# 1. Cài đặt các công cụ cần thiết
apt-get update && apt-get install -y iptables ipset iptables-persistent

# 2. Tạo IPSet cho Blacklist và WhiteList
ipset create nroshield-whitelist hash:ip hashsize 4096 maxelem 65536 2>/dev/null
ipset create nroshield-blacklist hash:ip hashsize 4096 maxelem 65536 timeout 86400 2>/dev/null

# 3. Flush rules cũ (CỰC KỲ CẨN THẬN)
iptables -F
iptables -X
iptables -t mangle -F
iptables -t mangle -X

# 4. Chính sách mặc định
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# 5. Cho phép Loopback và Established
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 6. Cho phép SSH (Quan trọng để không bị mất kết nối)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 7. Xử lý Port Game 7777 - Layer 4 Hardening
iptables -N SAMP_FILTER
iptables -A INPUT -p udp --dport $GAME_PORT -j SAMP_FILTER

# --- SAMP_FILTER Chain ---

# A. Chặn các IP trong Blacklist
iptables -A SAMP_FILTER -m set --match-set nroshield-blacklist src -j DROP

# B. Ưu tiên các IP trong Whitelist (VIP/Admin/Trusted)
iptables -A SAMP_FILTER -m set --match-set nroshield-whitelist src -j ACCEPT

# C. Chống Spam Connection (Connection Exhaustion)
iptables -A SAMP_FILTER -p udp -m connlimit --connlimit-above $MAX_CONN_PER_IP --connlimit-mask 32 -j DROP

# D. Lọc chuẩn gói tin Query SA:MP (p, i, r, c, x)
# Chống Query Flood làm lag server
iptables -A SAMP_FILTER -p udp -m length --length 10:20 -m limit --limit $QUERY_LIMIT --limit-burst $QUERY_BURST -j ACCEPT
iptables -A SAMP_FILTER -p udp -m length --length 10:20 -j DROP

# E. Cho phép RakNet Handshake và Data (Gói tin từ 20 bytes trở lên)
# Giới hạn tốc độ gói tin mới (New connections) để tránh UDP Flood
iptables -A SAMP_FILTER -p udp -m conntrack --ctstate NEW -m hashlimit --hashlimit-name samp_conn --hashlimit-mode srcip --hashlimit-upto 200/sec --hashlimit-burst 100 -j ACCEPT
iptables -A SAMP_FILTER -p udp -m conntrack --ctstate ESTABLISHED -j ACCEPT

# F. Default Drop cho traffic lạ vào port game
iptables -A SAMP_FILTER -j DROP

# 8. Mangle: Tối ưu hóa UDP và chống Fragmentation
iptables -t mangle -A PREROUTING -p udp --dport $GAME_PORT -j TOS --set-tos 0x10   # Low Delay
iptables -t mangle -A PREROUTING -p udp -m fragment -j DROP                       # Chặn mảnh cắt UDP (Attack vector phổ biến)

# 9. Lưu cấu hình
netfilter-persistent save

echo "=========================================================="
echo "[SUCCESS] NRO Shield Local v2 đã sẵn sàng trên port $GAME_PORT"
echo "Chế độ: BẢO VỆ TRỰC TIẾP (Direct Server Protection)"
echo "=========================================================="
