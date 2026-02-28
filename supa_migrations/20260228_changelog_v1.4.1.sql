-- Changelog v1.4.1 (28 Feb 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.1',
  '2026-02-28T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "Photo Lightbox: Desktop click-to-zoom now zooms to mouse cursor position instead of center",
      "Photo Lightbox: Mobile double-tap zoom with animated transition (zoom in to tap point, smooth zoom out)",
      "Photo Lightbox: Smooth swipe with dynamic opacity — adjacent photos fade in/out based on swipe position",
      "Photo Lightbox: Animated zoom percentage indicator using requestAnimationFrame",
      "WhatsApp: New normalizeWhatsappNumber helper with multi-country dial code support (20+ countries)"
    ]},
    {"category": "Improvements", "items": [
      "Photo Lightbox: Fast swipe chaining — rapid swipes cancel pending animation and chain correctly",
      "Photo Lightbox: Dynamic viewport height (dvh) for mobile — photos no longer cropped by browser chrome",
      "Photo Lightbox: Pinch-to-zoom jitter fix — disabled CSS transition during pinch gesture",
      "Photo Lightbox: Zoom-out animation improved — transformOrigin resets after transition completes",
      "Photo Lightbox: Touch-only pinch zoom — disabled click-to-zoom on touch devices to prevent interference",
      "Telegram Reminder: WhatsApp link now uses project country_code for correct dial code normalization"
    ]},
    {"category": "Fixes", "items": [
      "Fixed WhatsApp reminder link showing wrong country code (+82 Korea instead of +62 Indonesia) for numbers starting with 08xx",
      "Fixed empty src attribute console error in photo lightbox",
      "Fixed transformOrigin hardcoded to center instead of using state variable (broke double-tap zoom-to-point)",
      "Fixed stale closure issue with lastTapTime by converting from state to ref"
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Lightbox Foto: Zoom klik desktop sekarang zoom ke posisi kursor mouse, bukan ke tengah",
      "Lightbox Foto: Zoom double-tap mobile dengan animasi transisi (zoom in ke titik tap, zoom out smooth)",
      "Lightbox Foto: Swipe smooth dengan opacity dinamis — foto sebelah/sesudah fade sesuai posisi swipe",
      "Lightbox Foto: Indikator persentase zoom animasi menggunakan requestAnimationFrame",
      "WhatsApp: Helper normalizeWhatsappNumber baru dengan dukungan kode dial multi-negara (20+ negara)"
    ]},
    {"category": "Peningkatan", "items": [
      "Lightbox Foto: Fast swipe berantai — swipe cepat membatalkan animasi pending dan berantai dengan benar",
      "Lightbox Foto: Dynamic viewport height (dvh) untuk mobile — foto tidak terpotong oleh chrome browser",
      "Lightbox Foto: Perbaikan jitter pinch-to-zoom — transisi CSS dinonaktifkan saat gesture pinch",
      "Lightbox Foto: Animasi zoom-out diperbaiki — transformOrigin direset setelah transisi selesai",
      "Lightbox Foto: Pinch zoom khusus touch — zoom klik dinonaktifkan di perangkat sentuh untuk mencegah interferensi",
      "Pengingat Telegram: Link WhatsApp sekarang menggunakan country_code project untuk normalisasi kode dial yang benar"
    ]},
    {"category": "Perbaikan", "items": [
      "Memperbaiki link pengingat WhatsApp menampilkan kode negara salah (+82 Korea bukan +62 Indonesia) untuk nomor yang dimulai 08xx",
      "Memperbaiki error konsol atribut src kosong di lightbox foto",
      "Memperbaiki transformOrigin yang hardcoded ke center bukan menggunakan variabel state (merusak zoom double-tap ke titik)",
      "Memperbaiki masalah stale closure pada lastTapTime dengan mengubah dari state ke ref"
    ]}
  ]'::jsonb
);
