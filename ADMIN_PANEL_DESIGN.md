# 🛡️ MerQPrime Admin Panel — Full Architecture & Design

> **Status:** PROPOSAL — Awaiting approval before implementation  
> **Date:** 2026-02-10  
> **Current State:** Basic single-page admin (`/admin/page.tsx`) with 5 tabs  
> **Goal:** Production-grade, multi-page admin panel with sidebar navigation

---

## 📐 Current vs Proposed

### What Exists Today (Single File: 676 lines)
| Tab | Features |
|-----|----------|
| Overview | 4 stat cards (Total Users, Live Bots, Paper Bots, Global P&L) |
| User Management | User table with search, ban/activate, assign plan |
| Subscription Plans | Create/delete plans |
| Global Order Book | View trades by date |
| System Health | Broker connectivity, Kill switch, Error logs |

### What's Missing (Critical Gaps)
❌ No sidebar navigation (everything crammed in tabs)  
❌ No revenue/payment tracking  
❌ No individual user deep-dive  
❌ No announcement/notification system  
❌ No real-time monitoring dashboard  
❌ No audit logs (who did what)  
❌ No data export  
❌ No mobile-responsive admin view  
❌ No admin role management (only is_admin boolean)  

---

## 🏗️ Proposed Architecture

### File Structure
```
frontend/app/admin/
├── layout.tsx                    # Admin layout with sidebar + header
├── page.tsx                      # Dashboard (Overview)
├── users/
│   ├── page.tsx                  # User Management Table
│   └── [id]/
│       └── page.tsx              # Individual User Deep-Dive
├── trades/
│   └── page.tsx                  # Global Order Book
├── plans/
│   └── page.tsx                  # Subscription Plans Management
├── revenue/
│   └── page.tsx                  # Revenue & Payment Tracking
├── system/
│   └── page.tsx                  # System Health & Monitoring
├── announcements/
│   └── page.tsx                  # Notifications & Announcements
├── logs/
│   └── page.tsx                  # Audit & Activity Logs
└── settings/
    └── page.tsx                  # Admin Settings

frontend/components/admin/
├── AdminSidebar.tsx              # Collapsible sidebar navigation
├── AdminHeader.tsx               # Top header with breadcrumbs
├── StatCard.tsx                  # Reusable stat card component
├── UserDetailPanel.tsx           # User deep-dive panel
├── RevenueChart.tsx              # Revenue chart component
├── LiveMonitor.tsx               # Real-time bot monitor
└── DataTable.tsx                 # Reusable sortable/filterable table

backend-node/src/
├── controllers/
│   └── adminController.js        # NEW — All admin API logic
├── routes/
│   └── adminRoutes.js            # NEW — Admin route definitions
├── middleware/
│   └── adminAuth.js              # NEW — Admin authentication middleware
```

---

## 📄 Page-by-Page Design

---

### 1. 📊 Dashboard (Overview) — `/admin`
**The command center. At-a-glance health of the entire platform.**

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR  │         ADMIN DASHBOARD                     │
│           │                                             │
│  📊 Dashboard │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  👥 Users     │  │Total │ │Active│ │Today │ │Monthly│  │
│  📈 Trades    │  │Users │ │Bots  │ │P&L   │ │Revenue│  │
│  💳 Plans     │  │  47  │ │  12  │ │+₹4.2K│ │₹28.5K │  │
│  💰 Revenue   │  └──────┘ └──────┘ └──────┘ └──────┘  │
│  🖥️ System    │                                         │
│  📢 Announce  │  ┌─────────────────┐ ┌───────────────┐  │
│  📋 Logs      │  │  LIVE BOT       │ │  QUICK ACTIONS│  │
│  ⚙️ Settings  │  │  MONITOR        │ │               │  │
│               │  │  🟢 user1 LIVE  │ │  🔴 Kill All  │  │
│               │  │  🟢 user3 PAPER │ │  📢 Announce  │  │
│               │  │  🟢 user7 LIVE  │ │  📊 Export     │  │
│               │  └─────────────────┘ └───────────────┘  │
│               │                                         │
│               │  ┌─────────────────────────────────────┐│
│               │  │  RECENT ACTIVITY FEED               ││
│               │  │  • user5 started LIVE bot (2m ago)  ││
│               │  │  • user2 subscribed to Pro (5m ago) ││
│               │  │  • user8 registered (12m ago)       ││
│               │  └─────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

#### Stat Cards (Top Row)
| Card | Data | Color |
|------|------|-------|
| Total Users | Count from DB | Blue |
| Active Bots | Live + Paper running now | Green |
| Today's Global P&L | Sum of all active session P&Ls | Green/Red |
| Monthly Revenue | Sum of payments this month | Purple |
| New Users (7d) | Users registered in last 7 days | Cyan |
| Bot Uptime | Avg engine uptime % | Yellow |

#### Live Bot Monitor Widget
- Real-time list of all currently running bots
- Shows: Username, Mode (PAPER/REAL), Strategy, P&L, Duration
- Auto-refreshes every 5 seconds via WebSocket
- Click to navigate to user deep-dive

#### Quick Actions
- 🔴 **Kill All Bots** — Emergency stop all (existing)
- 📢 **Send Announcement** — Quick broadcast to all users
- 📊 **Export Report** — Download daily/weekly CSV report
- 🔄 **Refresh All** — Force reload all data

#### Activity Feed
- Last 20 platform events (user registrations, bot starts/stops, payments, errors)
- Real-time updates via WebSocket

---

### 2. 👥 User Management — `/admin/users`
**Full user lifecycle management.**

```
┌─────────────────────────────────────────────────────────┐
│  🔍 Search  │  Filter: [All ▾] [Plan ▾] [Status ▾]    │
│             │  Sort: [Newest ▾]    📥 Export CSV        │
├─────────────────────────────────────────────────────────┤
│ ID │ User      │ Email         │ Plan   │ Bot  │Status │
├────┼───────────┼───────────────┼────────┼──────┼───────│
│ 1  │ ayan_j    │ a@email.com   │ Pro    │ 🟢ON │Active │
│ 2  │ raj_k     │ r@email.com   │ Free   │ ⚫OFF│Active │
│ 3  │ priya_s   │ p@email.com   │ VIP    │ 🟢ON │Active │
│ 4  │ amit_p    │ amit@e.com    │ Free   │ ⚫OFF│Banned │
└─────────────────────────────────────────────────────────┘
```

#### Features
| Feature | Description |
|---------|-------------|
| **Search** | Search by username, email, phone |
| **Filters** | By plan, bot status, active/banned, has API key |
| **Sort** | By ID, username, registration date, last active |
| **Bulk Actions** | Select multiple users → Ban/Activate/Assign Plan |
| **Export** | Download user list as CSV |
| **Pagination** | 25/50/100 per page |

#### Row Actions (Per User)
- 👁️ **View Details** → Opens `/admin/users/[id]`
- ✏️ **Edit Plan** → Plan assignment dialog
- 🚫 **Ban/Unban** → Toggle user status
- 🔑 **Reset Password** → Force password reset
- 🗑️ **Delete User** → Permanent removal (with confirmation)

---

### 3. 👤 User Deep-Dive — `/admin/users/[id]`
**Everything about a single user on one page.**

```
┌─────────────────────────────────────────────────────────┐
│  ◀ Back to Users     USER: ayan_j                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PROFILE CARD              SUBSCRIPTION                 │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │ 👤 ayan_j        │      │ Plan: Pro         │        │
│  │ ayan@email.com   │      │ Expires: Mar 15   │        │
│  │ +91-98765xxxxx   │      │ Status: Active    │        │
│  │ Joined: Jan 2026 │      │ [Change Plan]     │        │
│  │ Last Login: 2h   │      └──────────────────┘        │
│  │ API Key: ✅ Set  │                                   │
│  │ [Ban] [Reset Pwd]│      BOT STATUS                   │
│  └──────────────────┘      ┌──────────────────┐        │
│                            │ 🟢 Running        │        │
│  TRADE HISTORY             │ Strategy: ORB     │        │
│  ┌──────────────────────┐  │ Mode: PAPER       │        │
│  │ Date filter [____]   │  │ P&L: +₹2,450     │        │
│  │                      │  │ Stocks: REL, TCS  │        │
│  │ RELIANCE BUY +₹120  │  │ Since: 09:15 AM   │        │
│  │ TCS      SELL -₹30  │  │ [Force Stop Bot]  │        │
│  │ INFY     BUY  +₹85  │  └──────────────────┘        │
│  └──────────────────────┘                               │
│                                                         │
│  PAYMENT HISTORY                                        │
│  ┌──────────────────────────────────────────┐           │
│  │ Feb 1  │ Pro Plan  │ ₹999  │ ✅ Success  │           │
│  │ Jan 1  │ Basic     │ ₹499  │ ✅ Success  │           │
│  │ Dec 15 │ Pro Plan  │ ₹999  │ ❌ Failed   │           │
│  └──────────────────────────────────────────┘           │
│                                                         │
│  ADMIN NOTES                                            │
│  ┌──────────────────────────────────────────┐           │
│  │ [Add note about this user...]            │           │
│  │                                          │           │
│  │ Feb 5: Complained about lag — fixed      │           │
│  │ Jan 20: Upgraded from Free manually      │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

#### Sections
| Section | Details |
|---------|---------|
| **Profile Card** | Username, email, phone, join date, last login, API key status |
| **Subscription** | Current plan, expiry, payment history, change plan button |
| **Bot Status** | Real-time bot state (running/stopped), strategy, mode, P&L |
| **Trade History** | All trades for this user with date filtering |
| **Payment History** | All Razorpay transactions |
| **Admin Notes** | Internal notes about the user (support tickets, complaints) |
| **Actions** | Ban, Reset Password, Force Stop Bot, Delete Account |

---

### 4. 📈 Global Order Book — `/admin/trades`
**All trades across all users.**

#### Features
- Date range picker (not just single date)
- Filter by: User, Symbol, Mode (Paper/Real), Status (Open/Closed)
- Sort by: Time, P&L, Symbol
- Aggregated stats at top: Total Trades, Win Rate, Total P&L, Avg Trade
- Export to CSV
- Color coding: Green = Profit, Red = Loss, Gray = Paper trades

---

### 5. 💳 Subscription Plans — `/admin/plans`
**Manage all subscription tiers.**

#### Features (Enhanced from Current)
| Feature | Description |
|---------|-------------|
| **Plan Cards** | Visual cards showing each plan with features list |
| **Create Plan** | Name, price, duration, features, max strategies, max stocks |
| **Edit Plan** | Modify existing plan details |
| **Deactivate Plan** | Soft delete (hide from new users, keep for existing) |
| **Subscriber Count** | Show how many users are on each plan |
| **Feature Matrix** | Compare plans side by side |

#### Plan Fields
```
- Name (e.g., "Pro Plan")
- Price (₹)
- Duration (Monthly/Quarterly/Yearly)
- Features (list)
- Max Strategies Allowed
- Max Stocks in Universe
- Real Trading Allowed (boolean)
- Priority Support (boolean)
- Is Active (boolean)
```

---

### 6. 💰 Revenue & Payments — `/admin/revenue` ⭐ NEW
**Financial overview and payment tracking.**

```
┌─────────────────────────────────────────────────────────┐
│  REVENUE DASHBOARD                                      │
│                                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│  │Today │ │This  │ │This  │ │Total │                   │
│  │₹2,998│ │Week  │ │Month │ │(All) │                   │
│  │      │ │₹8,994│ │₹28.5K│ │₹1.2L │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
│                                                         │
│  ┌─────────────────────────────────────────┐            │
│  │  REVENUE CHART (Line/Bar by Month)      │            │
│  │  📈 ___/‾‾‾\___/‾‾‾‾‾‾\                │            │
│  │     Jan  Feb  Mar  Apr  May             │            │
│  └─────────────────────────────────────────┘            │
│                                                         │
│  RECENT TRANSACTIONS                                    │
│  ┌──────────────────────────────────────────┐           │
│  │ Time     │ User   │ Plan │ Amount│Status │           │
│  │ 10:30 AM │ raj_k  │ Pro  │ ₹999  │ ✅    │           │
│  │ 09:15 AM │ priya  │ VIP  │ ₹1999 │ ✅    │           │
│  │ Yesterday│ amit_p │ Pro  │ ₹999  │ ❌    │           │
│  └──────────────────────────────────────────┘           │
│                                                         │
│  PLAN DISTRIBUTION                                      │
│  ┌─────────────────────┐                                │
│  │  🟦 Free: 60%       │                                │
│  │  🟩 Basic: 25%      │                                │
│  │  🟨 Pro: 10%        │                                │
│  │  🟥 VIP: 5%         │                                │
│  └─────────────────────┘                                │
└─────────────────────────────────────────────────────────┘
```

#### Features
| Feature | Description |
|---------|-------------|
| **Revenue Cards** | Today, This Week, This Month, All Time |
| **Revenue Chart** | Monthly revenue trend (line chart) |
| **Transaction Log** | All Razorpay payments with status |
| **Plan Distribution** | Pie/bar chart of users per plan |
| **MRR Tracking** | Monthly Recurring Revenue calculation |
| **Failed Payments** | List of failed transactions for follow-up |
| **Export** | Download financial reports as CSV |

---

### 7. 🖥️ System Health — `/admin/system`
**Platform monitoring and emergency controls.**

#### Sections
| Section | Description |
|---------|-------------|
| **Broker Connectivity** | Ping Angel One API, show latency, status history |
| **Engine Status** | Python engine health (memory, CPU, uptime) |
| **WebSocket Status** | Active WS connections count |
| **Kill Switch** | Emergency stop all bots (existing, enhanced with confirmation dialog) |
| **Error Rate** | Errors per hour chart |
| **System Logs** | Filterable logs (Error/Warning/Info) with search |
| **Server Resources** | Memory usage, disk space, active connections |

---

### 8. 📢 Announcements — `/admin/announcements` ⭐ NEW
**Broadcast messages to all users.**

#### Features
| Feature | Description |
|---------|-------------|
| **Create Announcement** | Title, message, type (info/warning/maintenance), target audience |
| **Schedule** | Send now or schedule for later |
| **Target Audience** | All users / Specific plan / Individual user |
| **Delivery** | In-app notification banner + optional email |
| **History** | List of past announcements with read count |
| **Templates** | Pre-built templates for common announcements (maintenance, new feature, etc.) |

#### Announcement Types
- 🔵 **Info** — General updates
- 🟡 **Warning** — Important notices
- 🔴 **Critical** — Maintenance/downtime alerts
- 🟢 **Feature** — New feature announcements

---

### 9. 📋 Audit Logs — `/admin/logs` ⭐ NEW
**Who did what and when.**

```
┌──────────────────────────────────────────────────────────┐
│  AUDIT LOG                         🔍 Search  📥 Export │
├──────────────────────────────────────────────────────────┤
│ Time        │ Admin    │ Action              │ Target    │
├─────────────┼──────────┼─────────────────────┼───────────│
│ 10:30:15 AM │ ayan_j   │ Banned user         │ amit_p    │
│ 10:28:00 AM │ ayan_j   │ Changed plan        │ raj_k     │
│ 09:45:00 AM │ system   │ Kill switch activated│ ALL      │
│ 09:15:00 AM │ ayan_j   │ Created plan        │ VIP Plan  │
│ Yesterday   │ ayan_j   │ Deleted announcement│ Maint.    │
└──────────────────────────────────────────────────────────┘
```

#### Tracked Events
- User ban/unban
- Plan assignments
- Plan creation/deletion
- Kill switch activations
- Admin logins
- Password resets
- Announcement sends
- Data exports

---

### 10. ⚙️ Admin Settings — `/admin/settings` ⭐ NEW
**Platform-wide configuration.**

#### Sections
| Section | Settings |
|---------|----------|
| **General** | Platform name, maintenance mode toggle, registration open/close |
| **Trading** | Default strategy, max stocks per user, trading hours |
| **Security** | Force 2FA, password requirements, session timeout |
| **Notifications** | Email settings, notification preferences |
| **Admin Roles** | Manage admin users, role permissions |

---

## 🎨 UI Design Principles

### Sidebar Navigation
- Collapsible (icon-only mode for more space)
- Active page highlighted
- Badge counts on important items (e.g., "3" on Users for pending actions)
- Dark theme consistent with main app

### Design Language
- Same design system as main dashboard (Zinc/Emerald/Red)
- shadcn/ui components throughout
- Responsive — works on tablet (but admin is primarily desktop)
- Data tables use `@tanstack/react-table` for sorting/filtering/pagination

### Color Scheme
```
Background:    zinc-950 (dark)
Cards:         zinc-900
Borders:       zinc-800
Text Primary:  white
Text Secondary: zinc-400
Accent:        blue-500 (primary actions)
Success:       emerald-500
Danger:        red-500
Warning:       amber-500
Revenue:       purple-500
```

---

## 🔌 Backend API Routes Needed

### New Routes (`/api/admin/*`)
```
GET    /admin/dashboard          → Stats, live bots, recent activity
GET    /admin/users              → Paginated user list with filters
GET    /admin/users/:id          → Single user details
POST   /admin/users/:id/ban     → Ban/unban user
POST   /admin/users/:id/plan    → Assign plan
POST   /admin/users/:id/reset   → Force password reset
DELETE /admin/users/:id          → Delete user

GET    /admin/trades             → All trades with filters
GET    /admin/trades/export      → CSV export

GET    /admin/plans              → All plans
POST   /admin/plans              → Create plan
PUT    /admin/plans/:id          → Edit plan
DELETE /admin/plans/:id          → Deactivate plan

GET    /admin/revenue            → Revenue stats
GET    /admin/revenue/chart      → Revenue chart data
GET    /admin/payments           → Payment transaction log
GET    /admin/payments/export    → CSV export

GET    /admin/system/health      → System health metrics
GET    /admin/system/logs        → System logs with filters
POST   /admin/system/kill        → Kill switch
POST   /admin/system/ping        → Broker connectivity check

GET    /admin/announcements      → All announcements
POST   /admin/announcements      → Create announcement
DELETE /admin/announcements/:id  → Delete announcement

GET    /admin/audit-log          → Audit events with filters
GET    /admin/audit-log/export   → CSV export
```

### Middleware
```javascript
// adminAuth.js — Applied to all /admin/* routes
- Verify JWT token
- Check is_admin flag on user
- Log admin action to audit trail
```

---

## 📊 Database Changes Needed

### New Tables
```sql
-- Admin audit log
CREATE TABLE admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES users(id),
    action VARCHAR(100),       -- 'ban_user', 'assign_plan', etc.
    target_type VARCHAR(50),   -- 'user', 'plan', 'system'
    target_id INT,
    details TEXT,              -- JSON details
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Announcements
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(20),          -- 'info', 'warning', 'critical', 'feature'
    target VARCHAR(50),        -- 'all', 'plan:pro', 'user:123'
    created_by INT REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin notes on users
CREATE TABLE admin_notes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    admin_id INT REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Model Changes
```
User model — Add:
  - is_admin: BOOLEAN (already exists conceptually, formalize it)
  - is_active: BOOLEAN (for ban functionality)
  - last_login: TIMESTAMP
  - created_at: TIMESTAMP

Plan model — Add:
  - max_strategies: INT
  - max_stocks: INT
  - real_trading_allowed: BOOLEAN
  - is_active: BOOLEAN
```

---

## 🚀 Implementation Priority (Phases)

### Phase 1 — Core (Must Have) 🔴
1. Admin Layout with Sidebar
2. Dashboard (Overview) with live stats
3. User Management (enhanced table + deep-dive)
4. Emergency Controls (Kill Switch)

### Phase 2 — Business (Important) 🟡
5. Revenue & Payments tracking
6. Subscription Plans management (enhanced)
7. Global Order Book (enhanced)
8. Audit Logs

### Phase 3 — Polish (Nice to Have) 🟢
9. Announcements system
10. Admin Settings
11. Data Export (CSV)
12. Charts & Visualizations

---

## ❓ Questions Before We Start

1. **Do you want all phases, or just Phase 1 first?**
2. **Do you have Razorpay payment data in the DB already?** (for Revenue page)
3. **Should the admin panel be mobile-responsive or desktop-only?**
4. **Any additional features you want that I haven't covered?**

---

*This document will be updated as we build. Ready to start on your approval! 🚀*
