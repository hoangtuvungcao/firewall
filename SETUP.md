# 🛠️ NRO Shield — Hướng dẫn Cài đặt Hoàn Chỉnh (Zero to Hero)

Tài liệu này là hướng dẫn **cầm tay chỉ việc từng lệnh một**. Chỉ cần copy và dán tuần tự từ máy chủ trống (VPS mới mua) cho đến khi NRO Shield hoạt động 100%.

**Yêu cầu môi trường:** Ubuntu 20.04 LTS hoặc Ubuntu 22.04 LTS.

---

## 📌 Phần 1: Đăng nhập và Chuẩn bị Hệ thống

Đầu tiên, hãy kết nối SSH vào VPS của bạn và chuyển sang quyền cao nhất (`root`):
```bash
sudo su
cd /root
```

**Bước 1: Cập nhật hệ điều hành và cài đặt các trình biên dịch/công cụ cơ bản**
*(Copy và dán toàn bộ cụm lệnh này vào terminal)*
```bash
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git nano unzip build-essential python3 python3-pip python3-venv python3-dev mariadb-server iptables ipset iptables-persistent net-tools iproute2 nginx
```

**Bước 2: Cài đặt Node.js phiên bản 18**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
node -v # Kết quả phải báo là v18.x.x
```

---

## 📌 Phần 2: Khởi tạo Cơ sở Dữ liệu

Chúng ta sẽ tạo thông tin Database an toàn. Bạn có thể bôi đen và copy khối lệnh dưới đây:

```bash
mysql -u root <<EOF
CREATE DATABASE nroshield CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nroshield'@'localhost' IDENTIFIED BY 'Matkhau1@#$';
GRANT ALL PRIVILEGES ON nroshield.* TO 'nroshield'@'localhost';
FLUSH PRIVILEGES;
EOF
```

---

## 📌 Phần 3: Clone Mã Nguồn & Cấu hình

**Bước 1: Tải mã nguồn về thư mục `/opt/nroshield`**
```bash
rm -rf /opt/nroshield
git clone https://github.com/hoangtuvungcao/firewall.git /opt/nroshield
cd /opt/nroshield
```

**Bước 2: Tự động tạo file `.env` (Chỉnh sửa chuỗi Token sau)**
Chạy khối lệnh sau để tạo file cấu hình. 
*(Lưu ý: Đừng quên cập nhật lại `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` bằng cách gõ `nano /opt/nroshield/.env` sau khi chạy lệnh này).*

```bash
cat <<EOF > /opt/nroshield/.env
# Database
DB_HOST=127.0.0.1
DB_USER=nroshield
DB_PASS=Matkhau1@#$
DB_NAME=nroshield

# JWT Auth
JWT_SECRET=KhoaBiMatNroShield_ThayDoiNeuCan
JWT_EXPIRES_IN=24h

# Ports
API_PORT=5000
AI_ENGINE_PORT=8000

# Telegram Bot (THAY ĐỔI 2 DÒNG NÀY TRƯỚC KHI CHẠY BOT)
TELEGRAM_BOT_TOKEN=123456789:ABCDEF-GHIJKL-Bot-Token-Cua-Ban
TELEGRAM_CHAT_ID=000000000
EOF
```

**Mở file lên để điền Token Telegram của bạn:**
```bash
nano /opt/nroshield/.env
```
*(Điền xong bấm `Ctrl + X`, sau đó phím `Y`, và `Enter` để lưu lại).*

---

## 📌 Phần 4: Biên dịch và Cài đặt Libraries

Chạy lần lượt 3 mục bên dưới:

**1. Cài đặt Backend API & Import Database Mẫu:**
```bash
cd /opt/nroshield/backend
npm install
node database/migrate.js
```
*(Lệnh migrate.js sẽ hiện chữ `✅ users`, `✅ servers`... là thành công)*

**2. Cài đặt Bot Telegram:**
```bash
cd /opt/nroshield/telegram_bot
npm install
```

**3. Cài đặt AI Engine (Python):**
```bash
cd /opt/nroshield/ai_engine
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

---

## 📌 Phần 5: Cấu hình Mạng & Firewall NAT (Rất Quan trọng)

Bắt buộc phải chạy các lệnh này để IP Tables chuyển tiếp được port:

**1. Bật IP Forwarding:**
```bash
echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/99-ipforward.conf
sysctl -p /etc/sysctl.d/99-ipforward.conf
```

**2. Tạo Blacklist cho AI và chặn từ chối dịch vụ (DDoS):**
```bash
ipset create nroshield-ai-blocked hash:ip timeout 3600 -exist
ipset create nroshield-ratelimited hash:ip timeout 600 -exist

iptables -I INPUT -m set --match-set nroshield-ai-blocked src -j DROP
iptables -I FORWARD -m set --match-set nroshield-ai-blocked src -j DROP
```

**3. Lưu quy tắc Firewall (Ngăn mất khi Reboot VPS):**
```bash
netfilter-persistent save
```

---

## 📌 Phần 6: Cấu hình Web Server (Nginx)

Nginx sẽ đóng vai trò hiển thị giao diện và làm cổng nối Proxy. Copy nguyên khối lệnh này dán vào Terminal để tự động tạo file config Nginx:

```bash
cat <<'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;
    root /opt/nroshield/web;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Backend Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Websocket (Biểu đồ Realtime)
    location /ws {
        proxy_pass http://127.0.0.1:5000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # AI Engine Status
    location /status {
        proxy_pass http://127.0.0.1:8000/status;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF
```

Khởi động lại Nginx:
```bash
ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

---

## 📌 Phần 7: Kích hoạt 3 Services Chạy Ngầm

Tự động tạo các file systemd thay vì gõ thủ công:

**1. Service API:**
```bash
cat <<'EOF' > /etc/systemd/system/nroshield-api.service
[Unit]
Description=NRO Shield API Backend
After=network.target mariadb.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nroshield/backend
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```

**2. Service Telegram Bot:**
```bash
cat <<'EOF' > /etc/systemd/system/nroshield-bot.service
[Unit]
Description=NRO Shield Telegram Bot
After=network.target nroshield-api.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nroshield/telegram_bot
ExecStart=/usr/bin/node bot.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```

**3. Service AI Engine:**
```bash
cat <<'EOF' > /etc/systemd/system/nroshield-ai.service
[Unit]
Description=NRO Shield AI Engine
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nroshield/ai_engine
Environment=PATH=/opt/nroshield/ai_engine/venv/bin:$PATH
ExecStart=/opt/nroshield/ai_engine/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```

**Kích hoạt và chạy toàn bộ:**
```bash
systemctl daemon-reload
systemctl enable nroshield-api nroshield-bot nroshield-ai
systemctl restart nroshield-api nroshield-bot nroshield-ai
```

Dùng lệnh này để kiểm tra xem cả 3 hệ thống đang báo xanh hay đỏ (nếu đều Active là chạy hoàn hảo):
```bash
systemctl status nroshield-api nroshield-bot nroshield-ai --no-pager
```

---

## 🎉 Phần 8: Cấp Quyền & Đăng Nhập

Khởi tạo **1 License Key** quyền lực vô hạn để bạn bắt đầu tạo tài khoản. Copy lệnh này:
```bash
mysql -u nroshield -p'Matkhau1@#$' nroshield -e "INSERT INTO license_keys (key_code, max_servers, max_ports_per_server, max_bandwidth_mbps) VALUES ('ADMIN-123456', 99, 99, 9999);"
```

Mọi thứ đã sẵn sàng 100%. Cách sử dụng:
1. Mở trình duyệt, truy cập địa chỉ IP của VPS: `http://<IP_VPS_CUA_BAN>/`
2. Mở Telegram, chat với Bot, chọn `/start` và gõ lệnh `/login` » Sau đó đăng ký tài khoản mới kèm mã Key là `ADMIN-123456`.
3. Bạn đã chính thức là Admin vĩnh viễn hệ thống NRO Shield.

Nếu trong quá trình có lỗi, gõ các lệnh sau để check:
- Log API: `journalctl -u nroshield-api -n 50 -f`
- Log Bot: `journalctl -u nroshield-bot -n 50 -f`
- Log AI: `journalctl -u nroshield-ai -n 50 -f`
