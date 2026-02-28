# Changelog

## v1.4.1 (2026-02-28)

### ✨ Photo Lightbox Improvements

#### Swipe & Navigation
- **Smooth swipe with dynamic opacity** — adjacent photos fade in/out as you swipe, with smooth opacity transition based on swipe position
- **Fast swipe support** — rapid swipes cancel pending animation and chain correctly using `pendingSwipeIdx` tracking
- **Touch swipe** — real-time finger-following swipe on mobile, matching native gallery feel
- **Desktop mouse swipe** — click-and-drag to navigate between photos

#### Zoom
- **Desktop click-to-zoom** — progressive zoom (1x → 2x → 3x → MAX → reset) with zoom-to-cursor position on first click
- **Mobile double-tap zoom** — toggle zoom in/out with animated transition (RAF-based `animateZoom`)
- **Pinch-to-zoom jitter fix** — disabled CSS transition during pinch to prevent visual fighting
- **Smooth zoom-out animation** — `transformOrigin` resets only after transition completes, preventing snap-to-center

#### Zoom Indicator
- **Animated zoom percentage** — `displayScale` state animates smoothly via `requestAnimationFrame` for the indicator, while actual scale uses CSS/JS transition

#### Thumbnails
- **Mouse wheel scroll** — vertical mouse wheel converted to horizontal thumbnail scroll
- **Touchpad gesture support** — native browser handling preserved for trackpad gestures
- **Centered thumbnails** — first/last photo thumbnails remain centered, not stuck to edges

#### Mobile Optimizations
- **Dynamic viewport height** — `imageMaxH` uses `dvh` instead of `vh` to account for mobile browser chrome bars
- **Touch-only pinch zoom** — disabled click-to-zoom on touch devices (`isTouchDevice` ref) to prevent synthetic mouse events from interfering
- **Double-tap guard** — `doubleTapRef` prevents swipe start from re-enabling swiping after double-tap detection

#### Bug Fixes
- Fixed empty `src` attribute console error by conditionally rendering `<img>` when `imgSrc` is non-empty
- Fixed `transformOrigin` hardcoded to `'center center'` instead of using state variable
- Fixed stale closure issue with `lastTapTime` by converting from state to ref
- Removed duplicate/stale JSX code that was incorrectly placed outside the component

### 🔧 WhatsApp Number Normalization

- **New helper `normalizeWhatsappNumber`** — properly normalizes phone numbers with country dial code lookup
- **Multi-country support** — lookup table for 20+ countries (ID, MY, SG, TH, US, JP, KR, etc.)
- **Fixed wrong country code in Telegram reminder** — numbers like `082-2720-4700` were incorrectly sent as `+82` (South Korea) instead of `+62` (Indonesia)
- **Normalization rules:**
  - `0812...` → `62812...` (local format, leading `0` replaced with dial code)
  - `812...` → `62812...` (no prefix, dial code prepended)
  - `62812...` → `62812...` (already correct, unchanged)
  - Uses project's `country_code` for non-Indonesian vendors
- **Applied in:** Telegram bot reminder link (`lib/telegram.ts`) and client WhatsApp button (`client-view.tsx`)
