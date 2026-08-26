📄 Booking Room System PWA
A modern Enterprise Room Booking System built with React 19, Node.js (Express), and MySQL.

Designed to streamline the entire room booking lifecycle—from room reservations and multi-level approval to QR Code-based booking verification, real-time availability checking, and comprehensive reporting. Built on a scalable RESTful architecture with Progressive Web App (PWA) capabilities, the system delivers a fast, secure, and responsive experience while enabling users to instantly verify booking authenticity through QR Code scanning.

Designed to improve operational efficiency, strengthen room utilization governance, and provide a secure, traceable, and scalable platform for enterprise room management.

🚀 Technology Stack
<p align="center">
https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react
https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite
https://img.shields.io/badge/Node.js-18-339933?style=for-the-badge&logo=node.js
https://img.shields.io/badge/Express-4.22-000000?style=for-the-badge&logo=express
https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql
https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa
https://img.shields.io/badge/MUI-5.15-007FFF?style=for-the-badge&logo=mui

</p>
📖 Overview
This project demonstrates an enterprise-grade room booking workflow commonly implemented within corporate organizations.

The system enables secure room management through:

✅ Secure room reservations

✅ Multi-level approval workflow (GA & SuperAdmin)

✅ QR Code generation for booking verification

✅ QR Code-based booking authentication and scanning

✅ Real-time room availability checking

✅ Role-Based Access Control (RBAC)

✅ Comprehensive audit trail

✅ Progressive Web App (PWA)

✅ Enterprise booking lifecycle management

✨ Key Features
📋 Room Management
Room CRUD operations

Room capacity management

Facilities & location tracking

Active/Inactive room status

Advanced search & filtering

Export to Excel

📅 Booking Management
Create room bookings

Edit bookings (pending status only)

Delete bookings (pending status only)

Real-time conflict checking

Booking history tracking

Pagination & filtering

Export to Excel

✅ Approval Workflow
Multi-level approval process (GA & SuperAdmin)

Approve / Reject with comments

Booking status tracking

Approval history

Pending approvals dashboard

Approval timeline

👥 User & Role Management
Secure JWT Authentication

Role-Based Access Control (RBAC)

User profile management

Edit profile & change password

Activity logging

Supported roles:

Super Admin

Admin

GA (General Affairs)

Employee

Receptionist

📊 Dashboard & Analytics
Real-time booking statistics

Pending approvals count

Room utilization metrics

Recent bookings activity

Charts & visualizations

Role-based dashboard views

📱 QR Code Integration
QR Code generation for each booking

QR Code scanning for verification

Download QR Code as PNG

Print QR Code

Instant booking details on scan

Approve/Reject via QR scan

📈 Reports & Analytics
Booking statistics per day/week/month

Status distribution charts (Pie Chart)

Room usage statistics (Bar Chart)

Advanced filtering (date range, status, room)

Export reports to Excel

Comprehensive data tables

🔒 Security Features
Secure JWT Authentication

Password Hashing (bcrypt)

Authorization Middleware (RBAC)

Protected REST API

Rate Limiting (100 req / 15 min)

CORS Protection

Helmet Security Headers

Session Management

Input Validation

📱 Progressive Web App (PWA)
Designed to provide a native application experience across desktop and mobile devices.

Features:

Installable on Desktop & Mobile

Web App Manifest

Service Worker Support

Responsive User Interface

Fast Asset Loading

Native App-like Experience

Home Screen Installation

🎨 Responsive User Interface
Built using modern frontend technologies:

React 19

Vite

Material-UI (MUI)

React Router DOM

React Query (TanStack Query)

Axios

Chart.js

Responsive for:

✅ Desktop

✅ Tablet

✅ Mobile

🛠 Technology Stack
Category	Technology
Frontend	React 19 + Vite
Language	JavaScript (ES6+)
UI Components	Material-UI (MUI)
Styling	Emotion / MUI System
Progressive Web App	Web App Manifest + Service Worker
State Management	React Query (TanStack Query)
Forms	React Hook Form
Validation	Yup
Notifications	MUI Snackbar / Alert
Backend	Node.js + Express.js
ORM	Raw SQL (MySQL2)
Database	MySQL 8.0
Authentication	JWT + bcrypt
Session	Express-Session + MySQL Store
API	RESTful API
Rate Limiting	Express-Rate-Limit
Security	Helmet, CORS
Logging	Morgan
👥 User Roles
Role	Responsibilities
Super Admin	Full system administration, user management, system configuration, booking oversight
Admin	User management, room management, booking management
GA (General Affairs)	Review, approve, reject, and monitor bookings
Employee	Create, edit, and manage own bookings
Receptionist	QR Code verification, check-in, booking viewing
🏗 Project Architecture
text
                 Progressive Web App (PWA)
                               │
                        React 19 + Vite
                               │
                     RESTful API (JSON over HTTP)
                               │
                  Node.js + Express Backend
                               │
                            MySQL2
                               │
                             MySQL 8.0
📁 Project Structure
text
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
📸 Screenshots
Login Page
https://via.placeholder.com/800x400?text=Login+Page

Dashboard
https://via.placeholder.com/800x400?text=Dashboard

Booking Management
https://via.placeholder.com/800x400?text=Booking+Management

Approval System
https://via.placeholder.com/800x400?text=Approval+System

QR Code Scanner
https://via.placeholder.com/800x400?text=QR+Code+Scanner

Reports & Analytics
https://via.placeholder.com/800x400?text=Reports+%2526+Analytics

🚀 Getting Started
Prerequisites
Node.js 18+

MySQL 8.0+

NPM or Yarn

Git
