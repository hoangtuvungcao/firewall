#!/bin/bash

# ==========================================================
# NRO SHIELD ENTERPRISE v2 - UNIFIED SETUP
# (Run this once to deploy the entire Enterprise Suite)
# ==========================================================

echo "=========================================================="
echo "   NRO SHIELD ENTERPRISE v2 - INSTALLATION"
echo "=========================================================="

# 1. Chạy System Tuning (Kernel)
bash ./firewall/setup_sysctl.sh

# 2. Chạy RAW Hardening (High-Level Drops)
bash ./firewall/hardened_raw.sh

# 3. Chạy Global Threat Intel Sync
bash ./firewall/sync_intel.sh

# 4. Thiết lập XDP (Nếu driver hỗ trợ)
# bash ./firewall/load_xdp.sh

# 5. Khởi động Backend + AI + DPI
cd backend
npm install
npm install -g pm2
pm2 start server.js --name nroshield-v2

echo "=========================================================="
echo "[COMPLETE] Hệ thống Enterprise đã sẵn sàng hoạt động!"
echo "Bạn có thể truy cập Dashboard tại port 5050."
echo "=========================================================="
