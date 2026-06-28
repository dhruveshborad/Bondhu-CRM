# 🏢 Bondhu CRM — Mini ERP System

A full-featured, production-ready **Mini ERP / CRM system** built with React, TypeScript, and Supabase. Manage customers, suppliers, products, purchases, sales, attendance, and tasks — all in one place, with real-time inventory tracking and role-based access control.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Frontend Architecture](#-frontend-architecture)
- [Backend Architecture](#-backend-architecture)
- [Database Schema](#-database-schema)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Project Structure](#-project-structure)

---

## ✨ Features

| Module | Description |
|---|---|
| 🔐 **Authentication** | Email/password login via Supabase Auth with role-based access |
| 📊 **Dashboard** | Key KPIs, revenue overview charts, recent sales, and low-stock alerts |
| 📦 **Products** | Full CRUD with SKU, categories, purchase/selling price, and stock tracking |
| 👥 **Customers** | Customer directory with contact details |
| 🏭 **Suppliers** | Supplier management for purchase sourcing |
| 🛒 **Purchases** | Record purchases from suppliers, linked to specific stores |
| 💰 **Sales** | Create invoices with line items, discounts, and tax; auto-decrement stock |
| 🏪 **Stores** | Multi-store support with per-store stock tracking |
| 🕐 **Attendance** | Clock-in/clock-out tracking per user per store |
| ✅ **Tasks** | Task assignment system with status tracking (Pending → In Progress → Completed) |
| 📈 **Reports** | Generate and export PDF reports (via jsPDF) |
| ⚙️ **Settings** | User profile management and role administration |

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| [React](https://react.dev/) | 19 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 6 | Type safety |
| [Vite](https://vite.dev/) | 8 | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Utility-first styling |
| [React Router](https://reactrouter.com/) | 7 | Client-side routing |
| [TanStack Query](https://tanstack.com/query) | 5 | Server-state management & caching |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5 | Global client-state management |
| [React Hook Form](https://react-hook-form.com/) | 7 | Form handling |
| [Zod](https://zod.dev/) | 4 | Schema validation |
| [Recharts](https://recharts.org/) | 3 | Data visualization charts |
| [Framer Motion](https://motion.dev/) | 12 | Animations & transitions |
| [Lucide React](https://lucide.dev/) | latest | Icon library |
| [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) | 4/5 | PDF generation & export |

### Backend

| Technology | Purpose |
|---|---|
| [Supabase](https://supabase.com/) | Backend-as-a-Service (BaaS) platform |
| **Supabase Auth** | User authentication & session management |
| **PostgreSQL** | Primary relational database |
| **Row Level Security (RLS)** | Fine-grained, row-level data access control |
| **PostgreSQL Triggers & Functions** | Automatic inventory stock management |

---

## 🖥 Frontend Architecture

The frontend is a **Single Page Application (SPA)** built with React + Vite, following a feature-based (vertical slice) architecture.

### State Management

Two layers of state are used:

- **[Zustand](https://zustand-demo.pmnd.rs/)** — lightweight global store for client-side state, primarily the authenticated user session (`authStore`).
- **[TanStack Query](https://tanstack.com/query)** — manages all server-state: fetching, caching, and invalidating data from Supabase. All data-fetching logic lives in service files under `src/services/`.

### Routing

Routing is handled by **React Router v7** (`BrowserRouter`). Route definitions live in `src/routes/`. Protected routes check the Zustand auth store to redirect unauthenticated users to the login page.

### Forms & Validation

All forms use **React Hook Form** with **Zod** resolvers for schema-based validation. This ensures type-safe, declarative form logic with minimal boilerplate.

### Component Organization

```
src/components/
├── common/       # Shared utility components (e.g., data tables, modals)
├── layout/       # App shell (sidebar, navbar, layout wrappers)
└── ui/           # Low-level UI primitives (Button, Input, Toaster, etc.)
```

### Feature Modules

Each feature (e.g., `customers`, `sales`) is self-contained under `src/features/` and follows this structure:

```
src/features/<feature>/
├── components/   # Feature-specific components (forms, list items, detail views)
└── pages/        # Page-level components rendered by the router
```

### PDF Export

Reports are generated client-side using **jsPDF** + **jspdf-autotable**, requiring no server-side processing.

---

## ☁️ Backend Architecture

The backend is entirely managed by **Supabase** — no custom server is required. The application communicates with Supabase directly from the browser using the official `@supabase/supabase-js` client.

### Supabase Client

A single Supabase client instance is initialized in `src/lib/` using the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. All service files import and use this shared client.

### Authentication

Supabase Auth handles user registration, login, and session management via JWTs. On app mount, `useAuthStore.initialize()` restores the session from local storage and sets up an `onAuthStateChange` listener to keep the Zustand store in sync.

### Service Layer

All database operations are abstracted into dedicated service files in `src/services/`:

| Service File | Responsibility |
|---|---|
| `customersService.ts` | CRUD for customers |
| `suppliersService.ts` | CRUD for suppliers |
| `productsService.ts` | CRUD for products + stock queries |
| `purchasesService.ts` | CRUD for purchases and purchase line items |
| `salesService.ts` | CRUD for sales, sale items, and invoice generation |
| `dashboardService.ts` | Aggregated KPIs and chart data queries |
| `profilesService.ts` | User profile reads and role management |
| `tasksService.ts` | Task assignment and status update operations |
| `localDb.ts` | Offline-capable local database abstraction |

### Row Level Security (RLS)

All tables have **RLS enabled**. The applied policies are:

- **Authenticated users** can perform full CRUD on core business tables (`products`, `customers`, `suppliers`, `purchases`, `sales`, `stores`, `attendance`, etc.).
- **Profiles** — any authenticated user can read all profiles; only **admins** can update roles.
- **Tasks** — users can only read tasks assigned to or created by them; only **admins** and **managers** can create tasks; only task creators can delete tasks.

### Automatic Inventory Management via Triggers

Stock levels are maintained automatically by PostgreSQL triggers — no application-level stock calculation is needed.

| Event | Trigger Function | Effect |
|---|---|---|
| `INSERT` on `purchase_items` | `fn_handle_purchase_item_insert` | Increments global product stock and per-store stock |
| `DELETE` on `purchase_items` | `fn_handle_purchase_item_delete` | Decrements stock; raises exception if it would go negative |
| `UPDATE` on `purchase_items` | `fn_handle_purchase_item_update` | Adjusts stock difference; handles product and store transfers |
| `INSERT` on `sale_items` | `fn_handle_sale_item_insert` | Validates stock availability, then decrements global and per-store stock |
| `DELETE` on `sale_items` | `fn_handle_sale_item_delete` | Returns stock to global and per-store counts |
| `UPDATE` on `sale_items` | `fn_handle_sale_item_update` | Re-validates and adjusts stock for quantity/product/store changes |
| `INSERT` on `auth.users` | `handle_new_user` | Auto-creates a matching `profiles` row for every new sign-up |

---

## 🗄 Database Schema

The database has **11 tables** managed in `supabase_schema.sql`:

```
auth.users          ← Managed by Supabase Auth
    │
    └── profiles    (id, email, full_name, role: admin|manager|staff)
         └── attendance (user_id, store_id, date, clock_in, clock_out)
         └── tasks      (assigned_to, assigned_by, store_id, title, status, due_date)

products            (id, name, sku, category, purchase_price, selling_price, stock, min_stock)
stores              (id, name, location)
product_store_stocks (product_id ⟶ products, store_id ⟶ stores, stock)  ← per-store inventory

suppliers           (id, name, phone, email, address)
purchases           (id, supplier_id ⟶ suppliers, store_id ⟶ stores, total_amount, purchase_date)
purchase_items      (id, purchase_id ⟶ purchases, product_id ⟶ products, quantity, unit_price)

customers           (id, name, phone, email, address)
sales               (id, customer_id ⟶ customers, store_id ⟶ stores, invoice_no, subtotal, discount, tax, grand_total, sale_date)
sale_items          (id, sale_id ⟶ sales, product_id ⟶ products, quantity, unit_price)
```

Performance indexes are created on all foreign key columns and frequently searched fields (`sku`, `name`, `invoice_no`, `date`).

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A [Supabase](https://supabase.com/) project

### 1. Clone the repository

```bash
git clone https://github.com/dhruveshborad/Bondhu-CRM.git
cd Bondhu-CRM
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root (see [Environment Variables](#-environment-variables)):

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key.

### 4. Set up the database

1. Open your Supabase project dashboard.
2. Navigate to **SQL Editor**.
3. Copy the contents of `supabase_schema.sql` and run it.

This will create all tables, indexes, triggers, RLS policies, and optionally seed mock data.

### 5. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase project's public anonymous key |

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server with HMR |
| `npm run build` | Type-check (`tsc`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint static analysis |

---

## 📁 Project Structure

```
Bondhu-CRM/
├── public/                  # Static assets
├── src/
│   ├── assets/              # Images and static imports
│   ├── components/
│   │   ├── common/          # Shared utility components
│   │   ├── layout/          # App shell (sidebar, navbar)
│   │   └── ui/              # Base UI primitives
│   ├── features/
│   │   ├── attendance/
│   │   ├── auth/
│   │   ├── customers/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── purchases/
│   │   ├── reports/
│   │   ├── sales/
│   │   ├── settings/
│   │   └── suppliers/
│   ├── lib/                 # Supabase client, React Query client
│   ├── routes/              # Route definitions and guards
│   ├── services/            # Supabase data-access layer
│   ├── store/               # Zustand global stores (authStore)
│   ├── types/               # Shared TypeScript interfaces
│   ├── App.tsx              # Root component
│   ├── main.tsx             # React entry point
│   └── index.css            # Global styles + Tailwind directives
├── supabase_schema.sql      # Full database schema + seed data
├── vercel.json              # Vercel deployment config (SPA rewrite rules)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 🚢 Deployment

The project is pre-configured for deployment on **Vercel**. The `vercel.json` includes a catch-all rewrite rule to support client-side routing.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

Simply connect your GitHub repository to a Vercel project and set the environment variables in the Vercel dashboard.

---

## 🛡 Role-Based Access

The system supports three user roles managed in the `profiles` table:

| Role | Permissions |
|---|---|
| `admin` | Full access to all features; can manage user roles; can create and delete tasks |
| `manager` | Can create and manage tasks; full access to business operations |
| `staff` | Can view and update tasks assigned to them; standard business operations access |
