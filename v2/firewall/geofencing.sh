#!/bin/bash

# ==========================================================
# NRO SHIELD ULTIMATE - GEOFENCING (Country Blocking)
# ==========================================================

echo "[INFO] Đang thiết lập Geofencing (Chỉ cho phép Việt Nam & SEA)..."

# Tạo IPSet cho Geofencing
ipset create nroshield-geofence hash:net hashsize 16384 maxelem 1000000 2>/dev/null

# Tải danh sách IP Việt Nam (vn.zone) từ IPDeny
URL="http://www.ipdeny.com/ipblocks/data/countries/vn.zone"

TEMP_FILE="/tmp/vn_ips.txt"
curl -s $URL > $TEMP_FILE

echo "[IMPORT] Đang nạp dải IP Việt Nam vào bộ lọc..."
while read line; do
  ipset add nroshield-geofence $line -exist
done < $TEMP_FILE

# Tùy chọn: Thêm các dải IP SEA khác nếu cần (la.zone, kh.zone, etc.)

# Áp dụng: CHỈ cho phép IP Việt Nam vào port 7777, các IP quốc tế khác bị DROP
# (Điều này giảm 95% áp lực từ Botnet nước ngoài)
iptables -t raw -A PREROUTING -p udp --dport 7777 -m set ! --match-set nroshield-geofence src -j DROP

echo "[SUCCESS] Geofencing đã kích hoạt: CHỈ IP Việt Nam được phép truy cập Game."
