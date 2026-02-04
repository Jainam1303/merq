# Mobile UX Optimization Roadmap

This document outlines the technical steps to transform the MerQ mobile dashboard into a smooth, native-app-like experience.

---

## 🛠️ Phase 1: Dependencies

Run this command to install the animation library:

```bash
npm install framer-motion clsx tailwind-merge
```

---

## 📐 Phase 0: Fix Responsive Breakpoints (Priority)

Change the mobile trigger from `1024px` (Tablets) to `768px` (Phones only).

### 1. Update `frontend/app/dashboard/page.tsx`
Change the visibility classes to switch at `md` instead of `lg`.

**Current:**
```tsx
{/* Mobile View */}
<div className="lg:hidden">...</div>
{/* Desktop View */}
<div className="hidden lg:flex ...">...</div>
```

**Change to:**
```tsx
{/* Mobile View */}
<div className="md:hidden">...</div>
{/* Desktop View */}
<div className="hidden md:flex ...">...</div>
```

### 2. Update `frontend/app/globals.css`
Update the media queries to match `768px`.

```css
/* Mobile-only and Desktop-only visibility */
@media (max-width: 767px) {  /* Changed from 1023px */
    .desktop-only { display: none !important; }
}

@media (min-width: 768px) {  /* Changed from 1024px */
    .mobile-only { display: none !important; }
}
```

### 3. Update Mobile Components
Check `MobileHeader.tsx` and `MobileNavigation.tsx` and change `lg:hidden` to `md:hidden`.

---

## ⚡ Phase 2: Smooth Transitions (Framer Motion)

### 1. Animated Tab Switching
**File:** `frontend/components/mobile/MobileDashboard.tsx`

Currently, tabs snap instantly. Wrap the content in `AnimatePresence` to enable slide animations.

**Implementation:**
```tsx
import { motion, AnimatePresence } from "framer-motion";

// ... inside component ...

<main className="pt-16 has-mobile-nav overflow-hidden">
  <AnimatePresence mode="wait">
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-full"
    >
      {renderContent()}
    </motion.div>
  </AnimatePresence>
</main>
```

### 2. Slide-Up Bottom Sheets (Modals)
**File:** `frontend/components/mobile/MobileDashboard.tsx`

Modals currently "pop" in. Convert them to iOS-style bottom sheets.

**Implementation:**
```tsx
{showOrderBook && (
  <div className="fixed inset-0 z-50 flex flex-col justify-end">
    {/* Backdrop */}
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => setShowOrderBook(false)}
    />
    
    {/* Sheet */}
    <motion.div 
      initial={{ y: "100%" }} 
      animate={{ y: 0 }} 
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 500 }}
      className="relative z-10 h-[90vh] bg-white dark:bg-zinc-950 rounded-t-2xl overflow-hidden shadow-xl"
    >
      {/* Content Here */}
      <MobileOrderBookView ... />
    </motion.div>
  </div>
)}
```

---

## 👆 Phase 3: Tactile Feedback (Touch Targets)

### 1. Active State Scaling
Add `active:scale-95` to all interactive elements. This gives immediate feedback when a user taps.

**File:** `frontend/components/mobile/MobileNavigation.tsx` (and others)

**Example:**
```tsx
<button
    className={cn(
        "flex flex-col items-center justify-center ... transition-all duration-200 active:scale-95", // Added active:scale-95
        isActive ? "..." : "..."
    )}
>
```

### 2. Expand Touch Areas
Ensure all clickable areas are at least **44px x 44px**. 
Check `MobileHeader.tsx` buttons to ensure they have enough padding or fixed size.

---

## 🎨 Phase 4: UI Polish

### 1. Skeleton Loading
Replace spinners with skeleton loaders for a perceived speed increase.

**Concept:**
```tsx
if (isLoading) {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
```

### 2. Optimistic Updates (Start/Stop)
**File:** `frontend/components/mobile/MobileDashboard.tsx`

When clicking "Start System", update the UI locally *before* the API responds to make it feel instant.

**Example:**
```tsx
const handleToggleSystem = async () => {
    // 1. Optimistic Update
    const previousState = isSystemActive;
    setIsSystemActive(!previousState); 

    try {
        // 2. API Call
        await fetchJson(previousState ? '/stop' : '/start', ...);
    } catch (e) {
        // 3. Rollback on Error
        setIsSystemActive(previousState);
        toast.error("Action failed");
    }
};
```

---

## 📱 Phase 5: Haptics (Optional)

Trigger device vibration on important actions (Start/Stop, Critical Errors).

```tsx
const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50); // 50ms vibration
    }
};

<button onClick={() => { triggerHaptic(); handleToggleSystem(); }}>
```

---

**Summary:** Implementing Phase 1 & 2 alone will make the app feel 80% more like a native application.
