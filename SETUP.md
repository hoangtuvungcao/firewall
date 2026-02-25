# 🛠️ NRO Shield — Hướng dẫn cài đặt Từng-Bước (Step-by-Step)

Tài liệu này cung cấp các lệnh chi tiết nhất để bạn tự setup một Shield VPS hoàn chỉnh.

---

## 📋 Bước 1: Chuẩn bị VPS
- **OS:** Ubuntu 22.04 LTS (Bắt buộc).
- **Yêu cầu:** VPS có Internet và quyền Root.

---

## 🚀 Bước 2: Tải Source Code & Cài đặt Dependencies

1. **Kết nối vào VPS bằng SSH:**
   ```bash
   ssh root@your_vps_ip
   ```

2. **Clone source code về thư mục `/opt`:**
   ```bash
   git clone https://github.com/hoangtuvungcao/firewall.git /opt/nroshield
   cd /opt/nroshield
   ```

3. **Chạy script cài đặt tự động:**
   *Lệnh này sẽ cài đặt Node.js, Python, MariaDB, iptables và các gói bảo mật.*
   ```bash
   chmod +x firewall/*.sh
   ./firewall/install.sh
   ```

---

## 🗄️ Bước 3: Cấu hình Cơ sở dữ liệu (Database)

Hãy copy và chạy các lệnh sau để khởi tạo DB MariaDB:

1. **Đăng nhập vào MySQL:**
   ```bash
   mysql -u root
   ```

2. **Chạy các lệnh SQL (Dán vào terminal MySQL):**
   ```sql
   -- Tạo database
   CREATE DATABASE nroshield CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   -- Tạo user và mật khẩu (Hãy thay 'Matkhau_Cua_Ban' bằng mật khẩu của bạn)
   CREATE USER 'nroshield'@'localhost' IDENTIFIED BY 'Matkhau_Cua_Ban';
   -- Cấp quyền
   GRANT ALL PRIVILEGES ON nroshield.* TO 'nroshield'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. **Chạy Migration để tạo các bảng:**
   ```bash
   cd /opt/nroshield/backend
   npm install
   node database/migrate.js
   node database/seed.js
   ```

---

## ⚙️ Bước 4: Cấu hình Biến môi trường (.env)

Mở file `.env` và điền thông tin:
```bash
cd /opt/nroshield
cp .env.example .env
nano .env
```
**Các mục cần lưu ý:**
- `VPS_PUBLIC_IP`: Điền IP của Shield VPS.
- `DB_PASSWORD`: Điền mật khẩu bạn vừa tạo ở Bước 3.
- `TELEGRAM_BOT_TOKEN`: Token lấy từ @BotFather.

---

## 🖥️ Bước 5: Thiết lập Dịch vụ Sytem (Systemd)

Tạo các service để app tự khởi động cùng VPS:

```bash
# Copy các file service vào hệ thống
sudo cp /opt/nroshield/firewall/services/*.service /etc/systemd/system/

# Load lại cấu hình
sudo systemctl daemon-reload

# Kích hoạt và Chạy toàn bộ services
sudo systemctl enable --now nroshield-api nroshield-ai nroshield-web nroshield-bot
```

---

## 🔐 Bước 6: Kích hoạt Tường lửa (Firewall)

Đây là bước quan trọng nhất để bảo vệ VPS:

1. **Thiết lập luật Firewall cơ bản:**
   *Script này sẽ chặn port scan, giới hạn ping và mở port cho Proxy.*
   ```bash
   cd /opt/nroshield/firewall
   ./iptables_base.sh
   ```

2. **Hardening hệ thống:**
   *Tối ưu hóa kernel để chịu tải cao.*
   ```bash
   ./sysctl_hardening.sh
   ```

---

## 📱 Bước 7: Cấu hình App App Mobile (Flutter)

Trên máy tính cá nhân của bạn:

1. **Đổi IP cho App:** 
   Mở file `flutter_app/lib/services/api_service.dart`, đổi `baseUrl` thành `https://your-domain.com` hoặc `http://VPS_IP:5000`.

2. **Build APK:**
   ```bash
   cd flutter_app
   flutter pub get
   flutter build apk --release
   ```

---

## 🔍 Bước 8: Kiểm tra trạng thái

Chạy script kiểm tra tổng thể:
```bash
cd /opt/nroshield
bash master_check.sh
```

**Tại sao cần các lệnh này?**
- `install.sh`: Giúp bạn không phải cài tay từng gói phần mềm.
- `iptables_base.sh`: Tạo ra "vòng vây" bảo vệ port, chỉ cho traffic hợp lệ đi qua.
- `MASQUERADE (trong backend)`: Giúp game client nhận diện traffic phản hồi từ Shield một cách thông suốt.

---
> [!TIP]
> **Khắc phục lỗi:** Nếu `apt update` bị treo, hãy kiểm tra kết nối Outbound Internet của VPS hoặc thử đổi DNS sang `8.8.8.8` trong `/etc/resolv.conf`.
