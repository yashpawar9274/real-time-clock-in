# 🏢 OM Value Homes — Attendance Desk

> A modern, secure and real-time employee attendance & payroll management system built specifically for **OM Value Homes**.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![Lovable](https://img.shields.io/badge/Built_with-Lovable_AI-FF4A64)
![Status](https://img.shields.io/badge/Status-Active-success)

---

## 📌 Overview

**OM Value Homes Attendance Desk** is an internal staff management application designed to simplify daily employee attendance, attendance verification and salary management.

Instead of relying on manual registers or basic attendance forms, staff members can securely sign in and record their daily attendance using a **live camera photo**.

Attendance records are synchronized with the administration dashboard in real time, allowing authorized administrators to monitor staff attendance and manage employee and payroll information from a centralized workspace.

The application was created for the internal operational requirements of **OM Value Homes**.

---

## ✨ Key Features

### 📸 Photo-Based Attendance

Employees must capture a live camera photo before recording attendance.

The application stores:

- Employee identity
- Attendance date
- Check-in timestamp
- Attendance photograph
- Attendance history

Each employee can record only one attendance entry for a work date.

---

### ⚡ Real-Time Attendance

Attendance records use **Supabase Realtime**.

When an employee checks in:

1. The attendance record is created.
2. The attendance photo is securely stored.
3. The administration dashboard updates automatically.
4. Admin receives a live check-in notification.

No manual dashboard refresh is required for new check-ins.

---

### 👤 Staff Workspace

Every staff member receives their own secure workspace.

Staff can:

- Check in using a live photograph
- View today's attendance status
- View check-in time
- View recent attendance history
- View monthly attendance count
- Access salary records
- View salary payment status

---

### 🆔 Automatic Employee ID

Every employee profile receives an automatically generated OM Value Homes employee code.

Example:

`OVH-XXXXXXXX`

This provides a consistent internal identification system without requiring administrators to manually create IDs.

---

## 🛡️ Administration Dashboard

Authorized administrators receive a separate administration workspace.

The dashboard provides centralized access to:

### Staff Management

Administrators can manage:

- Employee name
- Employee ID
- Phone number
- Department
- Job title
- Joining date
- Monthly salary
- Active / inactive employment status

### Attendance Monitoring

Administrators can review:

- Employee name
- Employee ID
- Attendance photograph
- Check-in date
- Check-in time
- Historical attendance records

### Live Notifications

New employee check-ins appear through real-time attendance notifications.

This helps the administration team know when staff members have recorded attendance without repeatedly refreshing the application.

---

## 💰 Salary & Payroll Management

The application includes an integrated salary management system.

Salary records support:

- Monthly base salary
- Attendance days
- Working days
- Salary deductions
- Bonuses
- Net salary
- Salary status
- Payment status

Administrators can generate salary records based on employee information and monthly attendance.

Salary states include:

`Draft → Processed → Paid`

Net salary is calculated from:

`Base Salary - Deductions + Bonuses = Net Salary`

Administrators can also manually apply salary adjustments when required.

---

## 🔐 Authentication & Authorization

The application uses secure authentication with separate access levels.

### Staff Role

Staff members can access only their own:

- Profile
- Attendance
- Attendance photos
- Salary information

### Admin Role

Administrators can access:

- Staff directory
- Organization attendance
- Employee records
- Salary records
- Payroll management
- Attendance photographs

Database access is protected using **Supabase Row Level Security (RLS)**.

This prevents users from accessing records outside their authorized scope even if they attempt to access the database directly.

---

## 🗄️ Backend Architecture

The backend is powered by **Supabase**.

Core database entities include:

### `profiles`

Stores employee information including personal and employment details.

### `user_roles`

Controls role-based access between:

- `admin`
- `staff`

### `attendance`

Stores daily attendance records including timestamps and attendance photo references.

### `salary_records`

Stores monthly payroll information, salary calculations, attendance totals and payment status.

---

## 🖼️ Secure Attendance Photos

Attendance photographs are stored separately using cloud storage.

The application generates temporary signed URLs when photographs need to be displayed.

This avoids exposing attendance photographs as permanently public files.

---

## 🧱 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 |
| Language | TypeScript |
| Framework | TanStack Start |
| Routing | TanStack Router |
| Styling | Tailwind CSS 4 |
| UI Components | Radix UI |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth / Lovable Cloud Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Data Fetching | TanStack Query |
| Validation | Zod |
| Icons | Lucide React |
| Build Tool | Vite |
| Testing | Vitest |
| Deployment | Vercel |
| AI Development Assistance | Lovable AI |

---

## 🏗️ Application Flow

```text
                     OM VALUE HOMES
                           │
                    Authentication
                           │
                ┌──────────┴──────────┐
                │                     │
              STAFF                 ADMIN
                │                     │
        Live Camera Photo       Admin Dashboard
                │                     │
             Check-In          ┌──────┼──────┐
                │              │      │      │
          Supabase Storage    Staff Attendance Payroll
                │
        Attendance Database
                │
         Supabase Realtime
                │
        Admin Notification
```

---

## 🚀 Local Development

### Prerequisites

Install:

- Node.js
- npm or Bun
- Git

### Clone Repository

```bash
git clone https://github.com/yashpawar9274/real-time-clock-in.git
cd real-time-clock-in
```

### Install Dependencies

Using npm:

```bash
npm install
```

or Bun:

```bash
bun install
```

### Start Development Server

```bash
npm run dev
```

or:

```bash
bun run dev
```

The development server will start locally through Vite.

---

## 🔑 Environment Configuration

Create a local `.env` file and configure the required Supabase/Lovable Cloud public environment variables.

Example:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLISHABLE_KEY=your_publishable_key

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

> ⚠️ **Security:** Never commit service-role keys, private API keys, passwords or other secrets to GitHub. Production secrets should be configured through the hosting provider's environment-variable settings.

---

## 🧪 Available Commands

```bash
npm run dev
```

Starts the development environment.

```bash
npm run build
```

Creates the production build.

```bash
npm run lint
```

Runs ESLint checks.

```bash
npm run test
```

Runs the Vitest test suite.

```bash
npm run format
```

Formats the project using Prettier.

---

## ☁️ Deployment

The project includes configuration for deployment on **Vercel**.

Production deployment requires the relevant Supabase environment variables to be configured in the Vercel project.

The application uses the Vercel server preset for TanStack Start to support server-rendered routes and direct navigation correctly.

---

## 🔒 Security

The project follows several security practices:

- Supabase authentication
- Role-based authorization
- PostgreSQL Row Level Security
- User-scoped attendance access
- Admin-restricted payroll operations
- Protected employee information
- Secure attendance photo storage
- Temporary signed image URLs
- Database-level validation
- Server-side access controls

> Never expose Supabase service-role credentials or private environment variables in frontend code or the public repository.

---

## 🤖 Built with Lovable AI

This application was developed with the assistance of **Lovable AI** for rapid prototyping, UI development and implementation workflows.

Lovable helped accelerate development while the product requirements, business workflow, feature decisions, customization and final implementation were created around the operational needs of **OM Value Homes**.

**Concept & Product:** Yash Pawar  
**Organization:** OM Value Homes  
**Development Assistance:** Lovable AI

---

## 🎯 Project Purpose

This application is intended to replace unnecessary manual attendance workflows with a simple process:

**Open App → Sign In → Take Photo → Check In → Done**

For administrators:

**Dashboard → Monitor Staff → Verify Attendance → Manage Payroll**

The goal is not to make attendance complicated.

The goal is to make it **simple, verifiable and organized**.

---

## 🗺️ Future Improvements

Potential future improvements include:

- GPS-based office attendance verification
- Configurable office geofencing
- Check-out functionality
- Leave management
- Holiday calendar
- Late-arrival tracking
- Attendance reports
- CSV / Excel export
- Payroll reports
- PWA installation
- Mobile push notifications
- Advanced admin analytics

---

## 👨‍💻 Creator

**Yash Pawar**

Digital Marketing & Technology  
OM Value Homes

GitHub: `@yashpawar9274`

---

## 📄 Usage

This project was created for **OM Value Homes** and its internal staff-management workflow.

Before reusing the application for another organization or commercial implementation, review the project's applicable licensing, security configuration and organization-specific logic.

---

<p align="center">
  <strong>OM VALUE HOMES</strong><br>
  Attendance • Staff Management • Payroll
</p>

<p align="center">
  Built with ❤️ for smarter internal operations.
</p>
