# 🛠️ NRO Shield — Hướng dẫn Cài đặt (Setup Guide)

Tài liệu này cung cấp hướng dẫn **chi tiết từ A-Z** để triển khai hệ thống NRO Shield lên một VPS mới 100% (Khuyến nghị dùng **Ubuntu 20.04 / 22.04 LTS**).

---

## 📌 Phần 1: Các yêu cầu chuẩn bị (Prerequisites)

1. Một VPS/Server sử dụng **Ubuntu 20.04/22.04**.
2. VPS phải có user **root** hoặc cấu hình `sudo` không cần mật khẩu.
3. Bot Telegram đã tạo trên `@BotFather` (lấy HTTP API Token).
4. Chat ID của tài khoản Telegram để nhận thông báo (lấy từ `@userinfobot`).

---

## 📌 Phần 2: Cài đặt Hệ sinh thái Cơ bản (Dependencies)

Đăng nhập SSH vào VPS và chạy tuần tự các lệnh sau để cài đặt môi trường.

### 2.1. Cập nhật hệ thống & Cài đặt công cụ mạng
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nano unzip python3 python3-pip python3-venv mariadb-server iptables iptables-persistent ipset
```

### 2.2. Cài đặt Node.js (v18.x)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Kiểm tra phiên bản
```

### 2.3. Cấu hình Nginx Web Server
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 📌 Phần 3: Cấu hình Cơ sở dữ liệu (MySQL / MariaDB)

Hệ thống cần 1 user và 1 database có tên `nroshield`.

```bash
sudo mysql -u root
```

Trong prompt của MySQL, gõ các lệnh sau (Đổi **Matkhau1@#$** thành mật khẩu của bạn):
```sql
CREATE DATABASE nroshield CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nroshield'@'localhost' IDENTIFIED BY 'Matkhau1@#$';
GRANT ALL PRIVILEGES ON nroshield.* TO 'nroshield'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 📌 Phần 4: Triển khai Mã Nguồn NRO Shield

### 4.1. Tải source code

Đưa toàn bộ thư mục `firewall` (trên máy cá nhân/git) vào đường dẫn `/opt/nroshield` trên VPS. Nếu bạn dùng Git:
```bash
cd /opt
git clone https://github.com/hoangtuvungcao/firewall.git nroshield
cd nroshield
```

### 4.2. Cấu hình file Môi trường (`.env`)
Chép file `.env.example` thành `.env`, sau đó mở file `.env` lên sửa thông tin.

```bash
cp .env.example .env
nano .env
```
Nội dung `.env` cần thiết lập:
```ini
# Database
DB_HOST=127.0.0.1
DB_USER=nroshield
DB_PASS=Matkhau1@#$
DB_NAME=nroshield

# JWT
JWT_SECRET=Thay_doi_chuoi_bi_mat_nay
JWT_EXPIRES_IN=24h

# Ports
API_PORT=5000
AI_ENGINE_PORT=8000

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCDE-abcd-12345-bot-token
TELEGRAM_CHAT_ID=12345678
```

### 4.3. Cài đặt các Modules và Khởi tạo DB

**Backend (Node.js):**
```bash
cd /opt/nroshield/backend
npm install
node database/migrate.js # Tạo các mảng dữ liệu tự động
```

**Telegram Bot (Node.js):**
```bash
cd /opt/nroshield/telegram_bot
npm install
```

**AI Engine (Python):**
```bash
cd /opt/nroshield/ai_engine
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 📌 Phần 5: Cấu hình Nginx (Dành cho Web Dashboard & API)

Xóa config mặc định và tạo cấu hình mới:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nano /etc/nginx/sites-available/default
```

Dán cấu hình sau:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;
    root /opt/nroshield/web;
    index index.html;

    # Giao diện tĩnh (Frontend)
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
        
        # Để hệ thống nhận diện IP người dùng
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Proxy
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
```

Kích hoạt và khởi động lại Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📌 Phần 6: Đưa Systemd vào chạy ngầm (Services)

Để API Backend, Bot và AI Engine tự động chạy khi VPS khởi động lại, tạo 3 Services trong Systemd.

### 6.1. Backend Service
```bash
sudo nano /etc/systemd/system/nroshield-api.service
```
```ini
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
```

### 6.2. Telegram Bot Service
```bash
sudo nano /etc/systemd/system/nroshield-bot.service
```
```ini
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
```

### 6.3. AI Engine Service
```bash
sudo nano /etc/systemd/system/nroshield-ai.service
```
```ini
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
```

### 6.4. Kích hoạt Services
```bash
sudo systemctl daemon-reload
sudo systemctl enable nroshield-api nroshield-bot nroshield-ai
sudo systemctl start nroshield-api nroshield-bot nroshield-ai
```

---

## 📌 Phần 7: Cấu hình Bật NAT Port/Firewall (Rất Quan Trọng)

Để IP Tables có thể chuyển tiếp Port (Forwarding / NAT Proxy), bạn phải kích hoạt IP Forwarding trên hệ điều hành Linux:

```bash
# Bật chuyển tiếp gói tin (IPv4 IP Forwarding)
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Mở ipset list để AI dùng
sudo ipset create nroshield-ai-blocked hash:ip timeout 3600
sudo ipset create nroshield-ratelimited hash:ip timeout 600

# Cấu hình IPtables Drop
sudo iptables -I INPUT -m set --match-set nroshield-ai-blocked src -j DROP
sudo iptables -I FORWARD -m set --match-set nroshield-ai-blocked src -j DROP

# Lên lịch lưu IP tables đề phòng khởi động lại bị mất
sudo netfilter-persistent save
```

---

## 🎉 HOÀN TẤT & KIỂM TRA

1. Truy cập IP của VPS trên Web Browser để mở Giao diện Dashboard: `http://<IP_VPS>/`
2. Vào Telegram, chat với Bot bạn vừa tạo, gõ lệnh `/login` » Sau đó đăng nhập.
3. Nếu bạn muốn lấy một Key Admin để đăng ký tài khoản mới:
```bash
mysql -u nroshield -p'Matkhau1@#$' nroshield -e "INSERT INTO license_keys (key_code, max_servers, max_ports_per_server, max_bandwidth_mbps) VALUES ('ADMIN-12345-XYZ', 10, 50, 1000);"
```

Mọi thứ đã sẵn sàng. Chúc bạn bảo vệ hệ thống của mình an toàn tuyệt đối với NRO Shield!
