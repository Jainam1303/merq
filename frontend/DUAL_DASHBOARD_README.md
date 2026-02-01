# MerQPrime - Dual Dashboard Setup

## 🎯 Current Setup

You now have **TWO** dashboard interfaces running side-by-side:

### 1. **Original Dashboard** (Current/Production)
- **URL**: `http://localhost:3000/`
- **Technology**: Custom React components
- **Status**: ✅ Fully functional with backend integration
- **Features**:
  - Landing page
  - Pricing page
  - Trading dashboard
  - Backtesting
  - Analytics
  - Order management
  - Profile & API settings
  - Razorpay payment integration

### 2. **New Dashboard** (Preview/Testing)
- **URL**: `http://localhost:3000/dashboard-new`
- **Technology**: shadcn-ui + Radix UI components
- **Status**: ⚠️ UI only - uses mock data
- **Features**:
  - Modern component library
  - Better visual design
  - Improved responsiveness
  - Dark mode optimized
  - Professional UI/UX

---

## 📁 Project Structure

```
frontend/
├── app/
│   ├── page.js              # Original dashboard (main route)
│   ├── dashboard-new/
│   │   └── page.tsx         # New UI preview
│   ├── layout.tsx
│   └── globals.css          # Merged styles (both UIs)
│
├── components/
│   ├── ui/                  # shadcn-ui components (49 files)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ... (46 more)
│   │
│   ├── layout/              # New UI layout components
│   │   ├── DashboardHeader.tsx
│   │   └── DashboardSidebar.tsx
│   │
│   ├── dashboard/           # New UI dashboard sections
│   │   ├── LiveTrading/
│   │   ├── Backtesting/
│   │   ├── Analytics/
│   │   ├── OrderBook/
│   │   └── Profile/
│   │
│   ├── Toast.js             # Original toast component
│   └── Modal.js             # Original modal component
│
├── lib/
│   └── utils.ts             # Utility functions (cn, etc.)
│
└── data/
    └── mockData.ts          # Mock data for new UI
```

---

## 🔄 Comparison

| Feature | Original Dashboard | New Dashboard |
|---------|-------------------|---------------|
| **UI Library** | Custom components | shadcn-ui + Radix UI |
| **Backend Integration** | ✅ Fully connected | ❌ Mock data only |
| **Design** | Functional | Modern & polished |
| **Components** | Custom built | Professional library |
| **Responsiveness** | Good | Excellent |
| **Dark Mode** | Supported | Optimized |
| **Landing Page** | ✅ Included | ❌ Not included |
| **Pricing Page** | ✅ Included | ❌ Not included |
| **Production Ready** | ✅ Yes | ❌ Needs backend integration |

---

## 🚀 Next Steps

### Option A: Keep Original (Recommended for now)
- Continue using the original dashboard
- It's fully functional and tested
- No risk of breaking anything
- Use new components individually as needed

### Option B: Migrate to New UI
**Steps required:**
1. Connect new UI components to Flask backend APIs
2. Replace mock data with real API calls
3. Integrate Razorpay payment in Profile component
4. Add WebSocket for live updates
5. Test thoroughly
6. Switch routes (make new UI the main page)

### Option C: Hybrid Approach
- Keep original for critical features
- Use new UI components for specific sections
- Gradually migrate one section at a time

---

## 🛠️ How to Use

### View Original Dashboard
```bash
# Already running at:
http://localhost:3000/
```

### View New Dashboard
```bash
# Navigate to:
http://localhost:3000/dashboard-new
```

### Switch Between Them
- From new UI: Click the banner link "Go back to original dashboard"
- From original UI: Navigate to `/dashboard-new` in browser

---

## 📝 Notes

### CSS Variables
Both UIs share the same `globals.css` with:
- Tailwind CSS v4
- shadcn-ui CSS variables
- Trading-specific colors (profit, loss, warning)
- Dark mode support
- Razorpay styling

### Dependencies Added
```json
{
  "@radix-ui/react-*": "Latest",
  "lucide-react": "^0.462.0",
  "recharts": "^2.15.4",
  "class-variance-authority": "^0.7.1",
  "sonner": "^1.7.4"
}
```

### Backend APIs (for migration reference)
```
/api/strategy/start
/api/strategy/stop
/api/strategy/status
/api/backtest
/api/orders
/api/positions
/api/user/profile
/api/user/plans
/razorpay/create_order
/razorpay/verify_payment
```

---

## ⚠️ Important

- **Original dashboard** = Production ready ✅
- **New dashboard** = Preview only ⚠️
- Don't delete original until new UI is fully integrated
- Test new UI thoroughly before switching

---

## 🎨 UI Components Available

You can now use these professional components in your original dashboard:

- **Buttons**: `<Button variant="default|outline|ghost" />`
- **Cards**: `<Card><CardHeader><CardTitle>...</CardTitle></CardHeader></Card>`
- **Dialogs**: `<Dialog><DialogTrigger>...</DialogTrigger></Dialog>`
- **Tabs**: `<Tabs><TabsList><TabsTrigger>...</TabsTrigger></TabsList></Tabs>`
- **And 45+ more components!**

---

**Created**: 2026-01-22  
**Status**: Both UIs running successfully ✅
