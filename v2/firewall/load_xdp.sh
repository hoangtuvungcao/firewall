#!/bin/bash

# ==========================================================
# NRO SHIELD ENTERPRISE - XDP LOADER
# ==========================================================

INTERFACE="eth0" # Đổi tên interface nếu cần (enp0s3, etc.)

echo "[INFO] Đang biên dịch và nạp XDP Filter..."

# 1. Cài đặt clang và llvm nếu chưa có
apt-get install -y clang llvm libelf-dev libbpf-dev linux-tools-common linux-tools-generic

# 2. Biên dịch XDP sang BPF Bytecode
clang -O2 -g -target bpf -c xdp_samp.c -o xdp_samp.o

# 3. Nạp vào interface (Chế độ Generic cho VPS)
# Nếu card mạng hỗ trợ, dùng 'xdpdrv' thay vì 'xdpgeneric' để nhanh hơn 10x
ip link set dev $INTERFACE xdpgeneric obj xdp_samp.o sec xdp_samp

if [ $? -eq 0 ]; then
    echo "[SUCCESS] XDP Shield đã được nạp vào $INTERFACE"
    echo "Traffic rác sẽ bị loại bỏ ngay tại lớp Driver!"
else
    echo "[ERROR] Không thể nạp XDP. Vui lòng kiểm tra kernel hoặc interface."
fi
