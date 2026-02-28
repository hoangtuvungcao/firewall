<div align="center">
  <img src="icon.ico" width="120" alt="NRO Shield Logo">
  <h1>🛡️ NRO Shield</h1>
  <p><strong>Hệ thống Tường lửa Thông minh tích hợp AI & Telegram Bot</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
  [![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-teal.svg)](https://fastapi.tiangolo.com/)
</div>

---

## 🌟 Giới thiệu Tóm tắt

NRO Shield là hệ thống phòng chống tấn công mạng (Anti-DDoS, TCP/UDP Flood, Slowloris) chuyên dụng bảo vệ các máy chủ game và dịch vụ trực tuyến. Cốt lõi của hệ thống sự kết hợp giữa **Linux IPTables/NAT** và mô hình **Machine Learning (Isolation Forest, Autoencoder)** để phát hiện dị thường kết hợp với tự động điều hướng và chặn lọc lưu lượng (Mitigation).

---

## 🚀 Tính năng Nổi bật

### 1. 🤖 AI-Powered Detection
Hệ thống AI Engine phân tích dữ liệu mạng (`ss`, `conntrack`, `RX/TX bytes`) liên tục để lập đường cơ sở (baseline) và phát hiện tấn công theo thời gian thực (Zero-day attack detection).
- Tự động chặn IP độc hại qua `ipset`.
- Rate-limiting thông minh để bảo vệ băng thông.

### 2. 📱 Telegram Bot Quản trị
Hệ thống cung cấp một Bot Telegram giúp thao tác thay vì sử dụng VPS trực tiếp:
- **Người dùng:** Đăng nhập (`/login`), tạo Proxy port ẩn IP gốc (`/addproxy`), xem thống kê (`/stats`), cảnh báo tấn công (`/attacks`).
- **Quản trị viên (Admin):** Khởi tạo License Key (`/createkey`), thu hồi Key (`/delkey`), khởi động lại IP tables (`/firewall`), theo dõi VPS health (`/system`).

### 3. 🌐 Dashboard Web Trực quan
Giao diện Web mượt mà (công nghệ Vanilla JS + Tailwind-like CSS):
- Biểu đồ traffic (Băng thông, Packets) thời gian thực.
- Bảng điều khiển Proxy Ports (Quản lý Port mapping).
- Danh sách tấn công bị chặn (Attack Logs).
- Nền tảng Authentication (Login/Register với Key bảo mật).

### 4. 🔗 Core Linux Networking
Sử dụng trực tiếp nhân Linux để định tuyến và chuyển tiếp port cực kỳ hiệu quả:
- **DNAT / SNAT / MASQUERADE** siêu tốc.
- Hỗ trợ cả TCP, UDP, và Dual-stack.
- Lưu lượng bị rớt tại iptables raw/mangle table trước khi vào hệ điều hành.

---

## 🏗️ Cấu trúc dự án (Architecture)

```text
nroshield/
├── ai_engine/          # Python FastAPI - Mô hình AI phân tích & ra quyết định tự động
├── backend/            # Node.js + Express JS - REST API, Database (MySQL) & Auth
├── frontend/           # HTML/CSS/JS thuần - Giao diện Web Client Dashboard
├── telegram_bot/       # Node.js (grammY) - Tương tác qua Telegram
├── ...
```

---

## 🛠️ Hướng dẫn Cài đặt

Muốn tự triển khai NRO Shield lên máy chủ CentOS/Ubuntu của bạn? Hãy xem hướng dẫn rất chi tiết từng bước nghiệm thu tại đây:

👉 **[Xem Hướng dẫn Cài đặt Chi tiết (SETUP.md)](SETUP.md)**

---

## 📞 Hỗ trợ & Liên hệ
Nếu bạn gặp khó khăn trong quá trình sử dụng hệ thống hoặc cài đặt, vui lòng tạo Issue trên GitHub hoặc liên hệ đội ngũ phát triển.

> **Cảnh báo:** Hãy thay đổi các mật khẩu mặc định (Root MySQL, JWT Secret, Admin Auth) khi đưa hệ thống ra môi trường Production (thực tế).
