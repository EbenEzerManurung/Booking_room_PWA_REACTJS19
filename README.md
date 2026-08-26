<div align="center">

# 🏢 Booking Room System

### Enterprise Room Reservation & Approval Platform

**A production-grade, full-stack Progressive Web Application for managing the complete room booking lifecycle — from reservation and multi-level approval to QR Code-based verification and real-time analytics.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.22-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![MUI](https://img.shields.io/badge/MUI-5.15-007FFF?style=for-the-badge&logo=mui&logoColor=white)](https://mui.com)
[![JWT](https://img.shields.io/badge/JWT-Secure-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
![Status](https://img.shields.io/badge/status-active--development-brightgreen?style=flat-square)

[Overview](#-overview) •
[Features](#-key-features) •
[Tech Stack](#-technology-stack) •
[Architecture](#-project-architecture) •
[Getting Started](#-getting-started) •
[Screenshots](#-screenshots)

</div>

---

## 📖 Overview

**Booking Room System** is an enterprise-grade meeting room reservation platform designed to replace manual, spreadsheet-driven booking processes with a secure, auditable, and fully digital workflow.

Built on a scalable RESTful architecture with **Progressive Web App (PWA)** capabilities, the system enables employees to reserve rooms in seconds, allows approvers to review requests through a structured multi-level workflow, and gives facility staff a fast, camera-based way to verify booking authenticity through **QR Code scanning** — all from any desktop or mobile device.

The project was built to demonstrate a real-world, production-style implementation of:

- Scalable **RESTful API design** with role-based authorization
- **Multi-level approval workflows** modeled after real corporate processes
- **QR Code generation and scanning** for tamper-resistant, real-time verification
- End-to-end **Progressive Web App** delivery (installable, offline-aware, mobile-first)
- Clean separation of concerns across **frontend, backend, and data layers**

> 💡 This system reflects how enterprise organizations manage shared resources — combining governance, traceability, and operational efficiency in a single platform.

---

## ✨ Key Features

### 📋 Room Management
- Full CRUD for room inventory (create, edit, deactivate, delete)
- Capacity, facilities, and location tracking
- Active / inactive status control
- Advanced search & filtering
- Export room data to Excel

### 📅 Booking Management
- Create, edit, and cancel bookings (with pending-state safeguards)
- Real-time conflict detection to prevent double-booking
- Full booking history with pagination & filtering
- Export booking records to Excel

### ✅ Multi-Level Approval Workflow
- Two-tier review process — **GA (General Affairs)** and **Super Admin**
- Approve / reject with mandatory comments for accountability
- Real-time status tracking and approval timeline
- Centralized pending-approvals dashboard

### 👥 User & Role Management
- Secure authentication via **JWT**
- Fine-grained **Role-Based Access Control (RBAC)**
- Self-service profile management & password changes
- Full activity/audit logging

**Supported roles:**
| Role | Responsibilities |
|---|---|
| **Super Admin** | Full system administration, user management, system configuration, booking oversight |
| **Admin** | User management, room management, booking management |
| **GA (General Affairs)** | Review, approve, reject, and monitor bookings |
| **Employee** | Create, edit, and manage own bookings |
| **Receptionist** | QR Code verification, check-in, booking viewing |

### 📊 Dashboard & Analytics
- Real-time booking statistics and KPIs
- Pending-approval counters
- Room utilization metrics
- Recent-activity feed
- Role-aware dashboard views with interactive charts

### 📱 QR Code Integration
- Unique QR Code generated automatically for every booking
- Live camera-based QR scanning for instant verification
- Downloadable & printable QR Codes
- One-tap approve/reject directly from a scanned booking

### 📈 Reports & Analytics
- Booking trends by day, week, and month
- Status distribution (pie chart) and room usage (bar chart)
- Advanced filters (date range, status, room)
- One-click export to Excel

### 🔒 Security
- JWT authentication with password hashing (**bcrypt**)
- Middleware-enforced authorization (RBAC)
- Rate limiting (100 requests / 15 min) against abuse
- **CORS** protection and **Helmet** security headers
- Server-side session management & input validation across all endpoints

### 📱 Progressive Web App (PWA)
- Installable on desktop and mobile — no app store required
- Web App Manifest + Service Worker support
- Fast asset loading with offline-aware caching
- Native-app-like experience with home-screen installation

---

## 🛠 Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + Vite |
| **Language** | JavaScript (ES6+) |
| **UI Components** | Material-UI (MUI) |
| **Styling** | Emotion / MUI System |
| **State & Data Fetching** | React Query (TanStack Query) |
| **Forms** | React Hook Form |
| **Validation** | Yup |
| **HTTP Client** | Axios |
| **Charts** | Chart.js |
| **PWA** | Web App Manifest + Service Worker |
| **Backend Runtime** | Node.js + Express.js |
| **Database** | MySQL 8.0 |
| **Data Access** | Raw SQL via MySQL2 |
| **Authentication** | JWT + bcrypt |
| **Session Store** | Express-Session + MySQL Store |
| **API Style** | RESTful (JSON over HTTP) |
| **Rate Limiting** | express-rate-limit |
| **Security Headers** | Helmet + CORS |
| **Logging** | Morgan |

Responsive across **Desktop**, **Tablet**, and **Mobile**.

---

## 🏗 Project Architecture

```
                 Progressive Web App (PWA)
                               │
                        React 19 + Vite
                               │
                  RESTful API (JSON over HTTP)
                               │
                  Node.js + Express Backend
                               │
                            MySQL
                               │
                             MySQL 8.0
```

The system follows a clean **client–API–database** separation, with role-based middleware guarding every protected route and a dedicated service layer isolating business logic from HTTP handling.

---

## 📁 Project Structure

```
booking_room_system/
│
├── frontend/
│   ├── public/
│   │   ├── icons/
│   │   └── favicon-*.png
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   │   ├── Bookings.jsx
│   │   │   ├── Approval.jsx
│   │   │   ├── QRScanner.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Users.jsx
│   │   │   └── Rooms.jsx
│   │   ├── utils/
│   │   ├── hooks/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── backend/
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── models/
    │   ├── routes/
    │   ├── services/
    │   ├── utils/
    │   └── server.js
    ├── package.json
    └── .env
```

---

## 📸 Screenshots
## Login

<img width="1864" height="927" alt="image" src="https://github.com/user-attachments/assets/f7375bde-7594-4abc-b877-d6589a77f080" />

## PWA
<img width="1918" height="852" alt="image" src="https://github.com/user-attachments/assets/6b73747f-983d-4b81-8c6e-d3252ecea21a" />

## Dashboard
<img width="1891" height="789" alt="image" src="https://github.com/user-attachments/assets/43ca0611-da15-4180-b940-b143d13e1257" />

## Ruangan
<img width="1912" height="943" alt="image" src="https://github.com/user-attachments/assets/374f53fe-e992-4840-b623-232107c547fc" />

## Booking
<img width="1918" height="934" alt="image" src="https://github.com/user-attachments/assets/15c3392d-ebc7-466d-af78-a661cfec07ff" />

## Approval - QRcode
<img width="1726" height="766" alt="image" src="https://github.com/user-attachments/assets/8f45d451-c4b0-4cb2-abc1-e7ceb20fc4f9" />

## Scan - QRcode
<img width="1891" height="844" alt="image" src="https://github.com/user-attachments/assets/33457f90-0d1a-4f6a-9f4c-65712523e092" />

## Result scan- QRcode
<img width="1843" height="900" alt="image" src="https://github.com/user-attachments/assets/d2ad5777-c0e1-4ceb-a587-f166e918a83b" />

## Report
<img width="1905" height="961" alt="image" src="https://github.com/user-attachments/assets/a8654916-f228-4660-86fd-af0de733245d" />

<img width="1915" height="927" alt="image" src="https://github.com/user-attachments/assets/3f2a3ad0-52be-4b45-9bf2-ae3adb209fc5" />


---

# License

MIT License

---

# Author

**Eben Nezer Manurung**

Backend Developer • Full Stack Developer
