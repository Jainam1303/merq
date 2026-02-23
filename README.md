# 🚀 MerQPrime — Algo Trading Platform

> **Full Project Documentation & Development History**
> **Last Updated:** 2026-02-23
> **Repository:** Jainam1303/merq

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Architecture](#-architecture)
3. [Tech Stack](#-tech-stack)
4. [Folder Structure](#-folder-structure)
5. [Backend — Node.js (Product Layer)](#-backend--nodejs-product-layer)
6. [Engine — Python (Execution Layer)](#-engine--python-execution-layer)
7. [Frontend — Next.js (View Layer)](#-frontend--nextjs-view-layer)
8. [Internal API Contract (Node ↔ Python)](#-internal-api-contract-node--python)
9. [Deployment](#-deployment)
10. [Trading Strategies](#-trading-strategies)
11. [Features Built](#-features-built)
12. [Mobile App](#-mobile-app)
13. [Admin Panel](#-admin-panel)
14. [Landing Page](#-landing-page)
15. [Key Configuration & Environment](#-key-configuration--environment)
16. [How to Run Locally](#-how-to-run-locally)
17. [Development Chat History (All Tabs)](#-development-chat-history-all-tabs)
18. [Known Issues & TODOs](#-known-issues--todos)
19. [Existing Documentation Files](#-existing-documentation-files)

---

## 🎯 Project Overview

**MerQPrime** is a **professional algorithmic trading platform** for Indian stock markets. It allows retail traders to:

- **Backtest** trading strategies against historical data
- **Paper Trade** with virtual money for risk-free simulation
- **Live Trade** with real broker integration (Angel One / SmartAPI)
- **Monitor** real-time P&L, active positions, and order execution
- **Manage risk** with Safety Guards, Stop-Loss, Take-Profit, and Kill Switch

The platform is a **SaaS product** with subscription plans managed via **Razorpay** payments, an **Admin Panel** for platform management, and a **responsive mobile UI**.

### Target Users
- Retail traders in Indian equity markets (NSE/BSE)
- No coding knowledge required from users
- Supports multiple simultaneous strategies per user

### Live URLs
- **Frontend (Vercel):** `https://merqprime.in` / `https://www.merqprime.in`
- **Backend API (AWS EC2):** `https://api.merqprime.in`
- **Python Engine:** Runs internally behind Node.js (not public-facing)

---

## 🏗 Architecture

The platform follows a **strict 3-tier architecture** with clear ownership boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js / Vercel)                   │
│              React UI — Renders data, sends user intent          │
│              NEVER calculates P&L or connects to broker          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS (JWT Auth)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              NODE.JS BACKEND (Express / AWS EC2)                 │
│        Product Layer — Auth, Users, Plans, Payments              │
│        Relays trading data from Python to Frontend               │
│        NEVER places orders or computes P&L                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP Internal API (HMAC-SHA256)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              PYTHON ENGINE (FastAPI / Flask / Uvicorn)            │
│        Execution Layer — Strategies, Orders, Broker WebSocket    │
│        Owns ALL live trading state, P&L, and order management    │
│        NEVER handles auth, payments, or user management          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    [ Angel One / SmartAPI Broker ]
```

### Core Principles (CRITICAL — Read Before Any Changes)

1. **No Shared State:** Node.js and Python share NO memory. They communicate ONLY via HTTP Internal API.
2. **Single Source of Truth:**
   - **User/Commercial Data** → Node.js (PostgreSQL)
   - **Trading State** → Python (In-Memory / JSON)
3. **Uni-directional Dependency:** Node.js calls Python. Python NEVER calls Node.js.
4. **Safety:** If Node.js dies, Python CONTINUES running trades. If Python dies, Node.js reports "Engine Offline" but User Data is safe.

### Data Ownership Map

| Data Entity | Primary Owner | Persistence | Access Control |
|:---|:---|:---|:---|
| User Profile | Node.js | PostgreSQL (Users) | Node Auth |
| Subscription | Node.js | PostgreSQL (Plans) | Node Auth |
| Broker Creds | Node.js | Encrypted PostgreSQL | Node App Only |
| Strategy Config | Node.js | PostgreSQL (UserStrategies) | Node Auth |
| Live Trades | Python | JSON / In-Memory | Internal API Only |
| Historical P&L | Python | PostgreSQL (Trades) | Internal API Only |
| Market Ticks | Python | In-Memory | Internal API Only |
| Logs (Audit) | Node.js | PostgreSQL (AuditLogs) | Admin Only |

> **Full architecture details:** See `ARCHITECTURE_BOUNDARIES.md`

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 14** | React framework (App Router) |
| **TypeScript** | Type safety |
| **Tailwind CSS v3** | Styling |
| **shadcn/ui + Radix UI** | Component library (49+ components) |
| **Recharts** | Charts and data visualization |
| **Framer Motion** | Animations and transitions |
| **Socket.IO Client** | Real-time WebSocket data |
| **Lucide React** | Icons |
| **Sonner** | Toast notifications |
| **React Day Picker** | Date selection |
| **React Hook Form + Zod** | Form handling and validation |

### Backend (Node.js)
| Technology | Purpose |
|---|---|
| **Express 5** | Web framework |
| **Sequelize** | PostgreSQL ORM |
| **PostgreSQL** (AWS RDS) | Primary database |
| **JWT (jsonwebtoken)** | Authentication |
| **Socket.IO** | Real-time WebSocket server |
| **Razorpay SDK** | Payment processing |
| **Axios** | HTTP client (calls Python) |
| **Helmet** | Security headers |
| **bcryptjs** | Password hashing |
| **Yahoo Finance 2** | Market data for marquee |

### Engine (Python)
| Technology | Purpose |
|---|---|
| **FastAPI + Uvicorn** | Internal API server |
| **Flask + Flask-SocketIO** | Legacy (being migrated away) |
| **SmartAPI-Python** | Angel One broker integration |
| **Pandas + NumPy** | Data analysis |
| **Backtrader** | Backtesting framework |
| **SQLAlchemy** | Database ORM |
| **PyOTP** | TOTP for broker auth |
| **WebSocket-Client** | Real-time market feeds |

### Infrastructure
| Service | Purpose |
|---|---|
| **AWS EC2** | Backend + Engine hosting |
| **AWS RDS** | PostgreSQL database |
| **Vercel** | Frontend hosting (auto-deploy from Git) |
| **PM2** | Process manager on EC2 |
| **Nginx** | Reverse proxy on EC2 |

---

## 📂 Folder Structure

```
d:\Bhavsar\30-1-26\                    # Project root
│
├── frontend/                           # Next.js Frontend (Vercel)
│   ├── app/                            # Next.js App Router
│   │   ├── page.js                     # Landing page (main route, ~218K lines)
│   │   ├── layout.tsx                  # Root layout (ThemeProvider, fonts)
│   │   ├── globals.css                 # Global styles + Tailwind + shadcn vars
│   │   ├── dashboard/                  # Dashboard pages
│   │   │   └── page.tsx                # Main dashboard (desktop + mobile)
│   │   ├── admin/                      # Admin panel pages
│   │   │   └── (multiple pages)        # Users, Trades, Plans, System, etc.
│   │   ├── about/                      # About Us page
│   │   ├── blog/                       # Blog page
│   │   ├── careers/                    # Careers page
│   │   ├── contact/                    # Contact page
│   │   ├── privacy/                    # Privacy policy
│   │   ├── terms/                      # Terms of service
│   │   ├── risk-disclosure/            # Risk disclosure
│   │   ├── legal/                      # Legal page
│   │   └── api-docs/                   # API documentation
│   │
│   ├── components/                     # React components
│   │   ├── dashboard/                  # Desktop dashboard components
│   │   │   ├── LiveTrading/            # Live trading section
│   │   │   │   ├── index.tsx           # Main live trading view
│   │   │   │   ├── StrategyConfig.tsx  # Strategy configuration panel
│   │   │   │   ├── ActivePositions.tsx # Active trade positions
│   │   │   │   ├── SafetyGuard.tsx     # Safety guard toggle
│   │   │   │   ├── LivePnLCard.tsx     # Live P&L display
│   │   │   │   ├── SystemStatus.tsx    # System status indicator
│   │   │   │   └── SystemLogs.tsx      # System logs display
│   │   │   ├── Backtesting/            # Backtest section
│   │   │   ├── BacktestHistory/        # Backtest history display
│   │   │   ├── Analytics/              # Analytics dashboard
│   │   │   ├── OrderBook/              # Order book / trade history
│   │   │   ├── Profile/                # User profile & API settings
│   │   │   ├── StarPerformers/         # Star performers feature
│   │   │   ├── Referrals/              # Referral system
│   │   │   └── TestOrderPanel.tsx      # Test order execution panel
│   │   │
│   │   ├── mobile/                     # Mobile-responsive components
│   │   │   ├── MobileDashboard.tsx     # Mobile main dashboard
│   │   │   ├── MobileHeader.tsx        # Mobile header with mode toggle
│   │   │   ├── MobileNavigation.tsx    # Bottom tab navigation
│   │   │   ├── MobileStatusView.tsx    # Status/Home tab
│   │   │   ├── MobileSettingsView.tsx  # Settings tab
│   │   │   ├── MobileTradesView.tsx    # Active trades tab
│   │   │   ├── MobileBacktestView.tsx  # Backtest tab
│   │   │   ├── MobileOrderBookView.tsx # Order book tab
│   │   │   ├── MobileAnalyticsView.tsx # Analytics tab
│   │   │   ├── MobilePlansView.tsx     # Plans tab
│   │   │   ├── MobileProfileSettingsView.tsx # Profile settings
│   │   │   ├── MobileLogsView.tsx      # Logs view
│   │   │   └── index.ts               # Module exports
│   │   │
│   │   ├── ui/                         # shadcn/ui components (49 files)
│   │   │   ├── button.tsx, card.tsx, dialog.tsx, tabs.tsx, ...
│   │   │   └── (46+ more Radix UI wrappers)
│   │   │
│   │   ├── layout/                     # Layout components
│   │   │   ├── DashboardHeader.tsx     # Dashboard header
│   │   │   └── DashboardSidebar.tsx    # Dashboard sidebar nav
│   │   │
│   │   └── admin/                      # Admin panel components
│   │       └── AdminSidebar.tsx        # Admin sidebar navigation
│   │
│   ├── hooks/                          # Custom React hooks
│   ├── lib/                            # Utility functions (cn, etc.)
│   ├── data/                           # Mock data for new UI
│   ├── public/                         # Static assets
│   ├── tailwind.config.ts              # Tailwind configuration
│   ├── next.config.js                  # Next.js configuration
│   └── package.json                    # Dependencies
│
├── backend-node/                       # Node.js Backend (AWS EC2)
│   ├── src/
│   │   ├── app.js                      # Main Express app (~34K, routes, middleware, Socket.IO)
│   │   ├── config/
│   │   │   └── database config         # PostgreSQL / Sequelize config
│   │   ├── controllers/
│   │   │   ├── adminController.js      # Admin panel API logic (~39K)
│   │   │   ├── authController.js       # Login, signup, JWT (~6K)
│   │   │   ├── tradingController.js    # Trading relay to Python (~13K)
│   │   │   ├── userController.js       # User profile, API keys (~13K)
│   │   │   ├── referralController.js   # Referral system (~12K)
│   │   │   └── webhookController.js    # Razorpay webhooks (~2K)
│   │   ├── models/
│   │   │   ├── User.js                 # User model (auth, profile, broker keys)
│   │   │   ├── Plan.js                 # Subscription plan model
│   │   │   ├── Subscription.js         # User ↔ Plan relationship
│   │   │   ├── Trade.js                # Trade history model
│   │   │   ├── Payment.js             # Razorpay payment records
│   │   │   ├── AuditLog.js            # Admin audit trail
│   │   │   ├── Announcement.js        # Platform announcements
│   │   │   ├── AdminNote.js           # Admin notes on users
│   │   │   ├── BacktestResult.js      # Backtest results storage
│   │   │   ├── StarPerformer.js       # Star performer data
│   │   │   ├── Stock.js               # Stock universe
│   │   │   ├── StrategyConfig.js      # Strategy configuration
│   │   │   ├── ReferralEarning.js     # Referral tracking
│   │   │   └── index.js               # Model associations
│   │   ├── routes/
│   │   │   ├── adminRoutes.js         # /api/admin/*
│   │   │   ├── authRoutes.js          # /api/auth/*
│   │   │   ├── userRoutes.js          # /api/user/*
│   │   │   ├── tradingRoutes.js       # /api/strategy/*, /api/bot/*
│   │   │   ├── starPerformerRoutes.js # /api/star-performers/*
│   │   │   ├── referralRoutes.js      # /api/referral/*
│   │   │   ├── alphaTickerRoutes.js   # /api/alpha-ticker/* (market data)
│   │   │   └── testOrder.js           # /api/test-order/*
│   │   ├── middleware/
│   │   │   ├── auth middleware         # JWT verification
│   │   │   └── admin auth middleware   # Admin role check
│   │   └── services/
│   │       └── (cron, backtest services)
│   ├── scripts/
│   │   ├── sync_db.js                 # Database schema sync
│   │   └── make_admin.js             # Promote user to admin
│   ├── cron_backtest.js               # Nightly backtesting cron job
│   ├── seed_plans.js                  # Seed subscription plans
│   ├── seed_stocks.js                 # Seed stock universe
│   ├── server.js                      # Entry point
│   └── package.json                   # Dependencies
│
├── engine-python/                      # Python Algo Engine (AWS EC2)
│   ├── main.py                        # FastAPI entry point (~10K)
│   ├── session_manager.py             # Core trading session management (~87K!)
│   ├── backtest_runner.py             # Backtesting engine (~13K)
│   ├── custom_strategy.py             # Custom strategy loader (~11K)
│   ├── whatsapp_alerts.py             # WhatsApp notification alerts (~5K)
│   ├── strategies/                    # Trading strategy implementations
│   │   ├── __init__.py
│   │   ├── base_live.py               # Base strategy class
│   │   ├── orb.py                     # Opening Range Breakout strategy
│   │   ├── ema_crossover.py           # EMA Crossover strategy
│   │   ├── ema_pullback_strategy.py   # EMA Pullback strategy
│   │   ├── engulfing_strategy.py      # Engulfing candle strategy
│   │   ├── time_based_strategy.py     # Time-based strategy
│   │   └── test.py                    # Strategy testing
│   ├── requirements.txt               # Python dependencies
│   └── logs/                          # Log files
│
├── logs/                               # Application logs
│
├── start_servers.bat                    # Windows batch file to start all servers
│
├── ──── DOCUMENTATION FILES ────
├── ARCHITECTURE_BOUNDARIES.md          # Architecture ownership rules
├── INTERNAL_API_CONTRACT.md            # Node ↔ Python API spec
├── MIGRATION_PROGRESS.md              # Flask → Node.js migration checklist
├── DEPLOYMENT.md                       # Deployment guide (Vercel + AWS)
├── ADMIN_PANEL_DESIGN.md              # Admin panel full design spec (~26K)
├── UI_FIXES_SUMMARY.md                # Desktop UI fix log
├── ADDITIONAL_UI_FIXES.md             # Additional UI fix log
├── MOBILE_FIXES_SUMMARY.md            # Mobile UI fix log
├── MOBILE_UX_ROADMAP.md               # Mobile UX improvement plan
├── API_SUBDOMAIN_SETUP.md             # API subdomain configuration
├── AWS_EC2_SETUP_GUIDE.md             # EC2 setup instructions
├── AWS_RDS_SETUP_GUIDE.md             # RDS setup instructions
├── PHASE_4_SSH_GUIDE.md               # SSH access guide
├── PHASE_5_VERCEL.md                  # Vercel deployment guide
├── REGRESSION_TEST_PLAN.md            # Regression test checklist
├── TEST_ORDER_GUIDE.md                # Test order verification guide
├── DECOMMISSIONING_PROTOCOL.md        # Legacy Flask decommission plan
├── landing-page-mvp.md                # Landing page MVP spec (~17K)
└── .gitignore
```

---

## 🟢 Backend — Node.js (Product Layer)

### Responsibilities
- User authentication (JWT-based login/signup)
- Subscription plan management (CRUD, assignment)
- Payment processing (Razorpay integration)
- Broker credential storage (encrypted)
- Relay of trading data from Python to Frontend
- Admin panel APIs
- WebSocket server for real-time updates to frontend
- Audit logging

### API Routes
```
Authentication:
  POST  /api/auth/register       → User registration
  POST  /api/auth/login          → JWT login

User:
  GET   /api/user/profile        → Get user profile
  PUT   /api/user/profile        → Update profile
  PUT   /api/user/api-keys       → Save broker API keys

Trading (relayed to Python):
  POST  /api/strategy/start      → Start algo session
  POST  /api/strategy/stop       → Stop algo session
  GET   /api/strategy/status     → Get live trading status
  POST  /api/backtest            → Run backtest
  GET   /api/orders              → Get order/trade history
  GET   /api/positions           → Get open positions

Payments:
  POST  /razorpay/create_order   → Create Razorpay order
  POST  /razorpay/verify_payment → Verify payment

Admin:
  GET   /api/admin/dashboard     → Admin overview stats
  GET   /api/admin/users         → User management
  POST  /api/admin/users/:id/ban → Ban/unban user
  GET   /api/admin/trades        → Global order book
  POST  /api/admin/system/kill   → Kill switch (emergency stop all)
  ...and more (see ADMIN_PANEL_DESIGN.md)

Star Performers:
  GET   /api/star-performers     → Get top-performing stocks
  POST  /api/star-performers/run → Trigger nightly backtest

Referrals:
  GET   /api/referral/stats      → Referral statistics
  POST  /api/referral/apply      → Apply referral code
```

### Database Models (PostgreSQL via Sequelize)
- **User** — Auth, profile, broker keys, subscription status, admin flag
- **Plan** — Subscription tiers (name, price, duration, features, limits)
- **Subscription** — User ↔ Plan relationship with expiry
- **Trade** — Historical trade records (symbol, entry/exit, P&L)
- **Payment** — Razorpay transaction records
- **AuditLog** — Admin action audit trail
- **Announcement** — Platform-wide announcements
- **AdminNote** — Internal admin notes on users
- **BacktestResult** — Stored backtest outcomes
- **StarPerformer** — Star performer stock data
- **Stock** — Stock universe
- **StrategyConfig** — Strategy metadata
- **ReferralEarning** — Referral tracking

---

## 🔵 Engine — Python (Execution Layer)

### Responsibilities
- All live trading logic and order execution
- Broker WebSocket connection (Angel One / SmartAPI)
- Strategy signal generation and evaluation
- Real-time P&L computation
- Stop-Loss / Take-Profit / Trailing Stop management
- OCO (One-Cancels-Other) order logic
- Backtesting engine
- Session state management

### Key Files
| File | Size | Purpose |
|---|---|---|
| `session_manager.py` | 87K | **Core** — Manages all trading sessions, positions, orders, P&L |
| `main.py` | 10K | FastAPI entry point, exposes internal API endpoints |
| `backtest_runner.py` | 13K | Backtesting engine using Backtrader |
| `custom_strategy.py` | 11K | Custom strategy loader |
| `whatsapp_alerts.py` | 5K | WhatsApp notification system |

### Internal API Endpoints (called by Node.js only)
```
POST  /engine/start           → Start a strategy session
POST  /engine/stop            → Stop a strategy session
GET   /engine/status/:user_id → Get live trading status
POST  /engine/update-risk     → Update risk parameters
GET   /health                 → Health check (broker + thread alive)
```

### Authentication (Internal API)
All requests from Node.js include:
- `X-Service-ID: merq-node-core`
- `X-Timestamp: <unix_timestamp>`
- `X-Internal-Sig: HMAC_HASH(body + timestamp + secret)`

---

## 🟠 Frontend — Next.js (View Layer)

### Key Features
- **Landing Page** — Full marketing landing page with hero, features, pricing, FAQ, testimonials
- **Dashboard** — Tabbed interface with sidebar navigation
  - **Live Trading** — Start/stop engine, strategy config, active positions, real-time P&L, system logs, safety guard
  - **Backtesting** — Run backtests with date/time picker, view results with equity charts
  - **Backtest History** — Historical backtest results
  - **Order Book** — Trade history with date filtering and CSV export
  - **Analytics** — Performance metrics, win rate, drawdown
  - **Star Performers** — Top-performing stocks from nightly backtests
  - **Profile** — User profile, broker API key management
  - **Plans** — Subscription plan selection and payment
  - **Referrals** — Referral system
- **Admin Panel** — Full admin dashboard (see Admin Panel section)
- **Mobile Dashboard** — Fully responsive mobile interface with bottom tabs
- **Static Pages** — About, Blog, Careers, Contact, Privacy, Terms, Risk Disclosure, Legal, API Docs
- **Theme Support** — Light/Dark mode with system preference detection

### Dual Dashboard System
The project has **two dashboard interfaces**:
1. **Original Dashboard** (`/`) — Production, fully integrated with backend
2. **New Dashboard** (`/dashboard-new`) — Preview, uses shadcn/ui, mock data only

> See `frontend/DUAL_DASHBOARD_README.md` for comparison

### WebSocket Integration
- Frontend connects to backend via Socket.IO at `wss://api.merqprime.in/socket.io/`
- Receives real-time: P&L updates, LTP (Last Traded Price), system status, trade events
- Auto-reconnect on disconnect

---

## 🔌 Internal API Contract (Node ↔ Python)

See the full specification in `INTERNAL_API_CONTRACT.md`. Key points:

- **Protocol:** HTTP REST, JSON format
- **Direction:** Node.js (Client) → Python (Server)
- **Auth:** HMAC-SHA256 signature
- **Idempotency:** `request_id` included in mutative calls, cached for 1 minute
- **Error Codes:** 401 (invalid sig), 403 (license expired), 409 (session active), 503 (broker disconnected)

---

## 🚀 Deployment

### Production Setup
| Component | Host | URL |
|---|---|---|
| Frontend | Vercel | `https://merqprime.in` |
| Backend API | AWS EC2 | `https://api.merqprime.in` |
| Database | AWS RDS | PostgreSQL |
| Python Engine | AWS EC2 | Internal only (behind Node.js) |

### Deployment Flow
1. Push to Git → Vercel auto-deploys frontend
2. SSH to EC2 → `git pull` → `npm install` → `pm2 restart all`
3. Database schema changes: `node scripts/sync_db.js`
4. Admin setup: `node scripts/make_admin.js <username>`

> See `DEPLOYMENT.md`, `AWS_EC2_SETUP_GUIDE.md`, `AWS_RDS_SETUP_GUIDE.md` for details

---

## 📊 Trading Strategies

### Implemented Strategies
| Strategy | File | Description |
|---|---|---|
| **ORB** | `orb.py` | Opening Range Breakout — Trades breakouts from the first 15/30-minute range |
| **EMA Crossover** | `ema_crossover.py` | Trades when short EMA crosses long EMA |
| **EMA Pullback** | `ema_pullback_strategy.py` | Enters on pullbacks to EMA in trending markets |
| **Engulfing** | `engulfing_strategy.py` | Trades bullish/bearish engulfing candle patterns |
| **Time-Based** | `time_based_strategy.py` | Strategy based on time-of-day patterns |
| **Custom** | `custom_strategy.py` | Dynamic strategy loader for user-defined logic |

### Strategy Features (Common)
- Configurable Stop-Loss and Take-Profit (% or absolute)
- Trailing Stop-Loss
- Position sizing (lot-based)
- Signal Cutoff Time (stops generating signals after specified time)
- Paper (simulation) and Real (live) trading modes
- Multi-stock support in single session
- Re-entry logic
- Volume filters

### Additional Strategies (Created in Chat)
- **VWAP Institutional Reclaim Strategy** — Trades reclaims of VWAP by institutional volume
- **Volume Weighted Breakout After Compression** — Breakout strategy triggered after low-volatility compression with volume confirmation

### Backtesting
- Uses **Backtrader** framework
- Historical data sourced from broker
- Generates equity curves, per-stock P&L, win rates, CAGR
- Results stored in database and displayed on dashboard
- Nightly cron job for Star Performers feature

---

## ✅ Features Built

### Core Trading Features
- [x] Live algorithmic trading with Angel One broker
- [x] Paper trading (simulation mode)
- [x] Real-time P&L tracking and display
- [x] Active position monitoring with live LTP feed
- [x] Stop-Loss / Take-Profit management (automated + manual edit)
- [x] OCO (One-Cancels-Other) order logic
- [x] Safety Guard (auto-stop if max daily loss exceeded)
- [x] Kill Switch (emergency stop all bots)
- [x] Signal Cutoff Time feature
- [x] Multi-strategy support
- [x] Multi-stock universe per session
- [x] CSV import/export for stock symbols
- [x] Strategy configuration UI (lots, SL%, TP%, timeframe, etc.)

### Backtesting Features
- [x] Historical backtesting engine
- [x] Date & time range selection
- [x] Equity curve visualization
- [x] Per-stock performance breakdown
- [x] Backtest history storage and display
- [x] Star Performers (nightly automated backtesting of top stocks)
- [x] One-click deploy from Star Performers

### User Management
- [x] User registration and login
- [x] JWT authentication
- [x] Broker API key management (encrypted storage)
- [x] Profile settings
- [x] Subscription plans (Free, Basic, Pro, VIP)
- [x] Razorpay payment integration
- [x] Referral system

### Dashboard & UI
- [x] Responsive desktop dashboard with sidebar
- [x] Mobile-responsive dashboard with bottom tabs
- [x] Dark/Light mode support
- [x] Real-time WebSocket updates
- [x] Order book with date filtering and CSV export
- [x] Analytics dashboard
- [x] System logs display
- [x] Toast notifications (Sonner)
- [x] Trading mode indicator (Paper/Real)

### Admin Panel
- [x] Admin dashboard with stats (Total Users, Active Bots, Today's P&L, Revenue)
- [x] User management (search, ban/activate, assign plan)
- [x] Global order book (all users' trades)
- [x] Subscription plan management (CRUD)
- [x] System health monitoring
- [x] Kill switch (emergency stop all)
- [x] Audit logging

### Landing Page & Marketing
- [x] Full landing page with hero, features, pricing, testimonials, FAQ
- [x] Market data marquee (Alpha Vantage API for closing prices)
- [x] About Us page
- [x] Blog, Careers, Contact pages
- [x] Legal pages (Terms, Privacy, Risk Disclosure)
- [x] Mobile-responsive design

### Infrastructure
- [x] AWS EC2 deployment
- [x] AWS RDS PostgreSQL
- [x] Vercel frontend deployment
- [x] SSL certificates
- [x] API subdomain setup (`api.merqprime.in`)
- [x] PM2 process management
- [x] Nginx reverse proxy

---

## 📱 Mobile App

The mobile interface is a **responsive web app** (not a native app) accessible via the same URL on mobile devices. It features:

### Mobile Components
- **MobileHeader** — Logo, Paper/Real mode toggle (switch-style with power icon)
- **MobileNavigation** — Bottom tab bar (Home, Trades, Backtest, Orders, Settings, Analytics)
- **MobileStatusView** — Home tab: Trading hours, strategy config, stock universe (with CSV import)
- **MobileTradesView** — Active positions display
- **MobileBacktestView** — Backtesting interface (button-based strategy selector, date picker)
- **MobileOrderBookView** — Trade history
- **MobileSettingsView** — Strategy settings
- **MobileAnalyticsView** — Performance analytics
- **MobilePlansView** — Subscription plans
- **MobileProfileSettingsView** — Profile and API settings

### Mobile-Specific Fixes Applied
- Extracted sub-components to prevent input focus loss (React anti-pattern fix)
- CSV Import and Delete All buttons added across all mobile views
- Fixed sticky header position for first active position visibility
- Responsive breakpoints changed from 1024px to 768px
- Touch-friendly button sizes (min 44px)
- Framer Motion animations for tab switching and modal transitions

> See `MOBILE_FIXES_SUMMARY.md` and `MOBILE_UX_ROADMAP.md` for details

---

## 🛡 Admin Panel

Full admin panel accessible at `/admin` with:

### Current Features
- **Overview Dashboard** — 4 stat cards, live bot monitor, quick actions, activity feed
- **User Management** — Searchable user table, ban/activate, assign plan, view details
- **Subscription Plans** — Create/delete subscription plans
- **Global Order Book** — View all users' trades by date
- **System Health** — Broker connectivity, kill switch, error logs

### Planned Enhancements (Design Complete)
- Sidebar navigation
- Revenue & payment tracking
- Individual user deep-dive page
- Announcement/notification system
- Audit log viewer
- Admin settings page
- Data export (CSV)

> See `ADMIN_PANEL_DESIGN.md` for the full design specification

---

## 🌐 Landing Page

Full marketing landing page built in `app/page.js` (~218K) with:

- **Sections:** Navigation, Hero, Trust Indicators, Problem Statement, Solution, Features (8), How It Works (3 steps), Testimonials, Pricing (3 tiers), FAQ (8 questions), Final CTA, Footer
- **Market Data Marquee** — Shows live closing prices from Alpha Vantage API, updates once daily after market close, with hardcoded fallback
- **Design:** Dark mode optimized, responsive, animations on scroll, glassmorphism effects
- **Pages:** About, Blog, Careers, Contact, Privacy, Terms, Risk Disclosure, Legal, API Docs

> See `landing-page-mvp.md` for the full MVP specification

---

## ⚙ Key Configuration & Environment

### Backend (.env)
```
DB_NAME=merqprime
DB_USER=<username>
DB_PASS=<password>
DB_HOST=<rds-endpoint>
JWT_SECRET=<secret>
RAZORPAY_KEY_ID=<key>
RAZORPAY_KEY_SECRET=<secret>
PYTHON_ENGINE_URL=http://localhost:5000
ALPHA_VANTAGE_API_KEY=<key>
```

### Frontend (next.config.js / .env.local)
```
NEXT_PUBLIC_API_URL=https://api.merqprime.in  (production)
NEXT_PUBLIC_API_URL=http://localhost:3002       (local dev)
```

### Python Engine
```
BACKEND_URL=http://localhost:3002  (local) / https://api.merqprime.in (prod)
```

### Port Mapping (Local Development)
| Service | Port |
|---|---|
| Frontend (Next.js) | 3003 |
| Backend (Node.js) | 3002 |
| Python Engine | 5000 |

---

## 🖥 How to Run Locally

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- PostgreSQL database
- Git

### 1. Start Backend
```bash
cd backend-node
npm install
node server.js
# Runs on port 3002
```

### 2. Start Python Engine
```bash
cd engine-python
pip install -r requirements.txt
python main.py
# Runs on port 5000
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on port 3003 → http://localhost:3003
```

### Or use the batch file:
```bash
start_servers.bat
```

---

## 💬 Development Chat History (All Tabs)

Below is a comprehensive summary of **every development conversation** that built this project, listed in reverse chronological order. Each entry includes the objectives, key changes, and files modified.

---

### Chat 1: Aggressively Tuning Grid Strategy
**Date:** 2026-02-22 | **ID:** `ddc45d40-96d6-4ee6-b448-d32186672f99`

**Objective:** Aggressively tune the Grid Trading strategy parameters to achieve a CAGR of 50%+.

**Work Done:**
- Iteratively adjusted lot sizing, grid spacing, trailing stop loss, and risk parameters
- Tested multiple parameter combinations through backtesting
- Optimized for maximum returns while managing drawdown
- Grid strategy parameter tuning for aggressive returns

---

### Chat 2: Optimizing OVIB Strategy
**Date:** 2026-02-22 | **ID:** `6efd926e-ab9c-40bc-a89a-5e7cd53ce68b`

**Objective:** Improve the OVIB (Opening Volume Imbalance Breakout) strategy to achieve 18-20% annual return per stock.

**Work Done:**
- Continuously adjusted strategy parameters: gap threshold, volume filters, R:R ratio, stop-loss, time windows, entry conditions
- Incorporated trailing stops and re-entry logic
- Analyzed per-stock performance to identify winners
- Iterative backtesting across multiple stocks
- Advanced parameter optimization

---

### Chat 3: Creating New Strategies
**Date:** 2026-02-22 | **ID:** `562faf04-5503-491f-a658-f885e9d6a2b0`

**Objective:** Create two new trading strategies based on detailed descriptions.

**Work Done:**
- Implemented **VWAP Institutional Reclaim Strategy**
  - Trades reclaims of VWAP level with institutional volume confirmation
- Implemented **Volume Weighted Breakout After Compression Strategy**
  - Breakout strategy triggered after low-volatility compression with volume surge
- Both strategies follow existing architectural patterns in `strategies/` folder
- Generated corresponding Python files

---

### Chat 4: Fixing API & WebSocket Connections
**Date:** 2026-02-10 to 2026-02-17 | **ID:** `0351ff58-d52c-4343-afde-3ed5e6bc00f3`

**Objective:** Fix API connection errors, WebSocket failures, and form validation issues.

**Work Done:**
- Resolved 403 error from Alpha Vantage API (market data for marquee)
- Fixed WebSocket connection failures between frontend and backend
- Ensured frontend connects to correct WebSocket URL (`wss://api.merqprime.in/socket.io/`)
- Added autocomplete attributes to password fields
- Fixed `'NoneType' object is not iterable` error in `session_manager.py`

**Files Modified:**
- `engine-python/session_manager.py`
- Frontend WebSocket configuration
- Backend WebSocket setup

---

### Chat 5: Mobile Signal Cutoff Time
**Date:** 2026-02-11 to 2026-02-15 | **ID:** `b303eb09-16c6-430d-9ba3-1bdd875103c6`

**Objective:** Add Signal Cutoff Time feature to mobile trading interface.

**Work Done:**
- Updated `MobileDashboard.tsx` to include `signalCutoffTime` in config state and start payload
- Updated `MobileStatusView.tsx` to display and allow editing of Signal Cutoff Time
- Updated `MobileSettingsView.tsx` to display and allow editing of Signal Cutoff Time
- Committed and pushed all changes to Git

**Files Modified:**
- `frontend/components/mobile/MobileDashboard.tsx`
- `frontend/components/mobile/MobileStatusView.tsx`
- `frontend/components/mobile/MobileSettingsView.tsx`

---

### Chat 6: Feature Suggestions for Platform
**Date:** 2026-02-15 | **ID:** `687f4926-d1c3-4bd7-8167-4b0f2e20cfb0`

**Objective:** Generate feature suggestions to enhance the platform.

**Work Done:**
- Brainstormed new features beneficial for:
  - Platform capabilities
  - User experience
  - Marketing and growth
  - Revenue generation
- Generated comprehensive feature list for future development

---

### Chat 7: Building Star Performers Feature
**Date:** 2026-02-13 | **ID:** `47865d4b-8fc1-4d4e-8763-6a3d0c84703b`

**Objective:** Implement Star Performers feature — automatically backtest top stocks nightly and display results.

**Work Done:**
- Created nightly cron job (`cron_backtest.js`) to backtest top stocks automatically
- Built Star Performers page with performance cards and equity charts
- Charts show growth starting from ₹1,00,000 base
- One-click deploy: users can deploy a winning strategy immediately
- Created `StarPerformer` model in database
- Added `starPerformerRoutes.js` for API endpoints

**Files Modified/Created:**
- `backend-node/cron_backtest.js`
- `backend-node/src/models/StarPerformer.js`
- `backend-node/src/routes/starPerformerRoutes.js`
- `frontend/components/dashboard/StarPerformers/index.tsx` (or equivalent)

---

### Chat 8: Mobile UI Fixes
**Date:** 2026-02-09 to 2026-02-10 | **ID:** `8e5633e7-2581-4bcb-bcaf-94053a8d0340`

**Objective:** Fix UI inconsistencies across the mobile app (Home, Backtest, Order Book tabs).

**Work Done:**
- **Home Tab:** Improved Trading Hours section UI
- **Backtest Tab:**
  - Replaced strategy selector dropdown with button-based UI
  - Implemented date/time picker matching desktop view
- **Order Book Tab:** Updated date picker to match desktop view
- **General:** Fixed all identified UI issues across mobile views

**Files Modified:**
- `frontend/components/mobile/MobileStatusView.tsx` (major refactor — extracted sub-components)
- `frontend/components/mobile/MobileSettingsView.tsx` (major refactor)
- `frontend/components/mobile/MobileBacktestView.tsx`
- `frontend/components/mobile/MobileOrderBookView.tsx`
- `frontend/components/mobile/MobileTradesView.tsx`
- `frontend/components/mobile/MobileHeader.tsx`

---

### Chat 9: Live LTP Feed for Active Positions
**Date:** 2026-02-07 to 2026-02-09 | **ID:** `ac2e4719-b45b-4cad-b6f5-4f6bfe5c1615`

**Objective:** Display live Last Traded Price (LTP) for stocks in active trade positions.

**Work Done:**
- Added real-time LTP feed to Active Positions section on dashboard
- LTP updates via WebSocket for stocks with open positions
- Ensured LTP displays only for currently active trades
- Real-time price information for immediate monitoring

**Files Modified:**
- `frontend/components/dashboard/LiveTrading/ActivePositions.tsx`
- Backend WebSocket relay logic
- Python engine market data broadcasting

---

### Chat 10: Fixing WebSocket Connection URLs
**Date:** 2026-02-07 to 2026-02-09 | **ID:** `49228b5b-5ccd-4380-9e10-449ed88846e9`

**Objective:** Resolve incorrect WebSocket connection URLs in the frontend.

**Work Done:**
- Fixed frontend connecting to wrong URL (`wss://www.merqprime.in/socket.io/` → `wss://api.merqprime.in/socket.io/`)
- Ensured stable WebSocket connection with auto-reconnect
- Verified data reception integrity
- Fixed both development and production configurations

**Files Modified:**
- Frontend Socket.IO client configuration
- `next.config.js` or WebSocket connection setup files

---

### Chat 11: Live Order & TP/SL Confirmation
**Date:** 2026-02-09 | **ID:** `edbc6190-1cd4-41d4-adc8-e183faecf8d8`

**Objective:** Confirm live trading order behavior for TP/SL modifications.

**Work Done:**
- Verified that TP/SL modifications apply to live broker orders (not just simulated)
- Confirmed BUY/SELL orders simultaneously place TP and SL orders (OCO behavior)
- Validated OCO logic in `session_manager.py`

---

### Chat 12: About Page Integration
**Date:** 2026-02-08 | **ID:** `200936ae-426a-4e9d-9916-51eba5d6f0ef`

**Objective:** Integrate About Us page into the app navigation and routing.

**Work Done:**
- Removed About link from main header navigation in `app/page.js`
- Created dedicated `/about` route with `app/about/page.js`
- Utilized existing Header and Footer components
- Moved AboutUs component to its proper route location

**Files Modified:**
- `frontend/app/page.js`
- `frontend/app/about/page.js`

---

### Chat 13: Marquee Data Update (Alpha Vantage)
**Date:** 2026-02-07 | **ID:** `e4d57d08-8d64-42a9-9f42-f5d089ee36ba`

**Objective:** Ensure landing page marquee displays accurate, up-to-date closing prices.

**Work Done:**
- Switched from Yahoo Finance API (was getting blocked) to Alpha Vantage API
- Implemented once-daily update after market close
- Added hardcoded fallback data for reliability
- Created backend endpoint for ticker data
- Verified backend implementation and logs

**Files Modified/Created:**
- `backend-node/src/routes/alphaTickerRoutes.js`
- `backend-node/test_alpha.js`
- Frontend marquee display component
- Landing page (`app/page.js`)

---

### Chat 14: Fixing UI Elements (Dashboard)
**Date:** 2026-02-07 | **ID:** `df9f87ed-b608-4d57-95bb-da8c3e3064ed`

**Objective:** Fix various dashboard UI inconsistencies.

**Work Done:**
- Fixed header glassmorphism and transparency
- Fixed tab highlighting (only active tab highlighted, dashboard tab not highlighted on sub-pages)
- Fixed analytics displaying duplicate information
- Removed wallet tab and all related code
- Made trader username dynamic in left panel

**Files Modified:**
- Dashboard header components
- Dashboard sidebar/navigation components
- Analytics component
- `frontend/app/globals.css`

---

### Chat 15: Refactoring Header and Sidebar
**Date:** 2026-02-06 to 2026-02-07 | **ID:** `fa999e9e-0129-48e1-9afb-680d06ce576a`

**Objective:** Refactor header and sidebar for proper mobile menu and theme switching.

**Work Done:**
- Implemented controlled sidebar component with open/close via props
- Integrated mobile menu toggle button in header
- Fixed theme toggle (light/dark mode) in header
- Ensured proper positioning and styling
- Updated UI fixes documentation

**Files Modified:**
- `frontend/components/layout/DashboardHeader.tsx`
- `frontend/components/layout/DashboardSidebar.tsx`

---

### Chat 16: Restarting Servers
**Date:** 2026-02-03 to 2026-02-07 | **ID:** `fe692192-567f-480a-9823-12b32f2e0470`

**Objective:** Restart both backend and frontend servers after code changes.

**Work Done:**
- Restarted Node.js backend server
- Restarted Next.js frontend server
- Verified both servers running correctly

---

### Chat 17: Starting Backend and Frontend
**Date:** 2026-01-24 to 2026-02-06 | **ID:** `511b1740-b389-4dea-87a2-75437b3284c2`

**Objective:** Start both backend and frontend servers for development.

**Work Done:**
- Executed `py app.py` for backend
- Executed `npm run dev` for frontend
- Verified both servers running successfully

---

### Chat 18: Creating Landing Page MVP
**Date:** 2026-02-06 | **ID:** `c9278015-63c1-4e94-b6c3-06233e431d0b`

**Objective:** Generate comprehensive MVP specification for the landing page.

**Work Done:**
- Created detailed landing page MVP document (`landing-page-mvp.md`)
- Defined all sections: Hero, Trust Indicators, Problem Statement, Solution, Features, How It Works, Testimonials, Pricing, FAQ, CTA, Footer
- Specified design system, color scheme, typography, animations, responsive breakpoints
- Defined conversion optimization elements, SEO requirements, accessibility standards
- Created component structure and technical requirements

**Files Created:**
- `landing-page-mvp.md` (17K detailed specification)

---

### Chat 19: Fixing Backtest History Display
**Date:** 2026-02-06 | **ID:** `343eae37-ace3-4751-8a8d-370d1a923abe`

**Objective:** Fix backtest results showing as combined single entry instead of individual per-stock entries.

**Work Done:**
- Fixed logic so each backtested stock generates a separate entry in Backtest History
- Ensured correct symbol and details displayed for each entry
- Fixed deduplication logic that was incorrectly combining results

**Files Modified:**
- `frontend/components/dashboard/BacktestHistory/index.tsx`
- Backend backtest results endpoint

---

### Chat 20: Fixing Deployment and UI (Time Picker)
**Date:** 2026-02-05 to 2026-02-06 | **ID:** `fe3b05b6-ec66-494d-befc-4d6d8b4b71fe`

**Objective:** Fix Backtesting time picker UI and address deployment errors.

**Work Done:**
- Fixed time picker display across all modes and directions in Backtesting component
- Investigated and fixed deployment errors on Vercel
- Ensured date/time pickers render correctly

**Files Modified:**
- `frontend/components/dashboard/Backtesting/index.tsx`
- Vercel deployment configuration

---

## Migration History: Flask → Node.js

The project underwent a **complete 9-phase migration** from a monolithic Flask backend to the current 3-tier architecture. All phases have been completed:

| Phase | Description | Status |
|---|---|---|
| Phase 0 | Freeze & Safety | ✅ Complete |
| Phase 1 | Define Boundaries | ✅ Complete |
| Phase 2 | Stand Up Node Backend | ✅ Complete |
| Phase 3 | Auth & Commercial Logic Migration | ✅ Complete (Razorpay pending) |
| Phase 4 | Node ↔ Python Internal API | ✅ Complete |
| Phase 5 | Event Flow Back to Node | ✅ Complete |
| Phase 6 | Frontend Cutover (React) | ✅ Complete |
| Phase 7 | Regression & Failure Testing | ✅ Complete |
| Phase 8 | Decommission Flask UI | ✅ Complete |
| Phase 9 | Post-Migration Hardening | ✅ Complete |

> See `MIGRATION_PROGRESS.md` for the full checklist

---

## ⚠ Known Issues & TODOs

### Remaining Work
- [ ] Razorpay payment processing migration to Node (partially done)
- [ ] Strategy access control per plan
- [ ] Paper vs live trading permission per plan
- [ ] Admin panel sidebar navigation (design complete, implementation pending)
- [ ] Revenue & payment tracking page in admin
- [ ] Announcement system
- [ ] VWAP and Volume Breakout strategies need production testing
- [ ] Mobile UX improvements (Phases 2-5 from MOBILE_UX_ROADMAP.md): Framer Motion animations, bottom sheets, skeleton loading, haptic feedback
- [ ] New Dashboard (`/dashboard-new`) backend integration
- [ ] Tag legacy-stable commit hash

### UI/UX Improvements Pending
- [ ] Skeleton loading states for mobile
- [ ] Optimistic UI updates for start/stop
- [ ] Slide-up bottom sheets for mobile modals
- [ ] Animated tab switching

---

## 📚 Existing Documentation Files

| File | Purpose |
|---|---|
| `ARCHITECTURE_BOUNDARIES.md` | Core architecture principles and ownership rules |
| `INTERNAL_API_CONTRACT.md` | Node ↔ Python API specification |
| `MIGRATION_PROGRESS.md` | Flask → Node.js migration checklist |
| `DEPLOYMENT.md` | Admin panel deployment guide |
| `ADMIN_PANEL_DESIGN.md` | Full admin panel design specification |
| `UI_FIXES_SUMMARY.md` | Desktop UI fixes log (Feb 11, 2026) |
| `ADDITIONAL_UI_FIXES.md` | Additional UI fixes log |
| `MOBILE_FIXES_SUMMARY.md` | Mobile UI fixes log |
| `MOBILE_UX_ROADMAP.md` | Mobile UX improvement roadmap |
| `API_SUBDOMAIN_SETUP.md` | API subdomain configuration |
| `AWS_EC2_SETUP_GUIDE.md` | EC2 setup instructions |
| `AWS_RDS_SETUP_GUIDE.md` | RDS PostgreSQL setup |
| `PHASE_4_SSH_GUIDE.md` | SSH access and tunneling guide |
| `PHASE_5_VERCEL.md` | Vercel deployment configuration |
| `REGRESSION_TEST_PLAN.md` | Full regression test plan |
| `TEST_ORDER_GUIDE.md` | Test order execution guide |
| `DECOMMISSIONING_PROTOCOL.md` | Legacy Flask decommission steps |
| `landing-page-mvp.md` | Landing page MVP specification |
| `frontend/DUAL_DASHBOARD_README.md` | Dual dashboard comparison |

---

## 🧠 Key Context for New Chat Agents

### Critical Files to Know About
1. **`engine-python/session_manager.py`** (87K) — The heart of the trading system. Contains ALL trading logic, position management, order execution, P&L computation. Changes here affect live trading.
2. **`backend-node/src/app.js`** (34K) — Main Express app with all routes, middleware, Socket.IO setup.
3. **`frontend/app/page.js`** (218K) — Full landing page. Very large file.
4. **`frontend/app/dashboard/page.tsx`** — Main dashboard that switches between desktop and mobile views.
5. **`frontend/components/mobile/MobileDashboard.tsx`** (37K) — Mobile dashboard controller.

### Architecture Rules (MUST Follow)
1. **Node.js NEVER places orders or computes P&L** — It only relays data from Python
2. **React NEVER connects to Python directly** — Always goes through Node.js
3. **Python NEVER handles auth, payments, or user management**
4. **Frontend NEVER calculates trading state** — It only renders what the backend provides

### Common Pitfalls
- **Port confusion:** Frontend=3003, Backend=3002, Python=5000. The old Python Flask used port 5001 (a bug was once found where trades were saving to the wrong port).
- **WebSocket URL:** Frontend MUST connect to `wss://api.merqprime.in/socket.io/`, NOT `wss://www.merqprime.in/socket.io/`.
- **Input focus loss in mobile:** Don't define sub-components inside the render function. Extract them outside and pass props.
- **Safety Guard polling:** Uses `isInteractingRef` to prevent polling from overwriting user changes.

### Broker Integration
- **Broker:** Angel One (SmartAPI)
- **Auth:** Uses API Key + Client ID + Password + TOTP
- **Orders:** Placed via SmartAPI Python SDK
- **Market Data:** Real-time via SmartAPI WebSocket
- **Trade persistence:** Python saves completed trades to PostgreSQL via Node.js backend API

---

*This README was generated on 2026-02-23 to provide comprehensive project context for development continuity.*
