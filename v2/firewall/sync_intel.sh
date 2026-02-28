#!/bin/bash

# ==========================================================
# NRO SHIELD ENTERPRISE - GLOBAL THREAT INTEL SYNC
# ==========================================================

echo "[INFO] Đang đồng bộ danh sách IP độc hại toàn cầu..."

# Tạo IPSet cho Intel nếu chưa có
ipset create nroshield-intel hash:ip hashsize 16384 maxelem 500000 2>/dev/null

# Danh sách các nguồn uy tín
URLS=(
  "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level1.netset"
  "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/stopforumspam_7d.netset"
)

TEMP_FILE="/tmp/nro_intel.txt"
> $TEMP_FILE

for url in "${URLS[@]}"; do
  echo "[DOWNLOAD] $url"
  curl -s $url | grep -E '^([0-9]{1,3}\.){3}[0-9]{1,3}' >> $TEMP_FILE
done

# Đưa vào IPSet
echo "[IMPORT] Đang nạp hàng nghìn IP vào bộ lọc Layer 4..."
while read ip; do
  ipset add nroshield-intel $ip -exist
done < $TEMP_FILE

# Áp dụng vào bảng RAW (Nhanh nhất trong iptables)
iptables -t raw -C PREROUTING -m set --match-set nroshield-intel src -j DROP 2>/dev/null || \
iptables -t raw -I PREROUTING -m set --match-set nroshield-intel src -j DROP

echo "[SUCCESS] Đã bảo vệ server khỏi danh sách đen quốc tế."
