-- Changelog v1.4.1 (28 Feb 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.1',
  '2026-02-28T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "Photo Viewer: Click to zoom now follows your mouse position on desktop",
      "Photo Viewer: Double-tap to zoom on mobile now zooms into where you tapped",
      "Photo Viewer: Smooth swipe between photos with fade effect on adjacent images",
      "Photo Viewer: Zoom level indicator now shows animated percentage",
      "Photo Viewer: Photos that were already viewed load instantly without loading screen",
      "Photo Viewer: New photos show a smooth fade-in effect after loading",
      "WhatsApp: Improved phone number formatting with support for 20+ country codes"
    ]},
    {"category": "Improvements", "items": [
      "Photo Viewer: Faster swiping now works smoothly without visual glitches",
      "Photo Viewer: Photos are no longer cut off on mobile devices",
      "Photo Viewer: Pinch-to-zoom on mobile is now smoother without shaking",
      "Photo Viewer: Zoom-out animation is now smoother and more natural",
      "Telegram Reminder: WhatsApp links now correctly use the country code set in project settings"
    ]},
    {"category": "Fixes", "items": [
      "Fixed WhatsApp reminder sending wrong country code for Indonesian numbers starting with 08xx",
      "Fixed occasional loading errors when viewing photos",
      "Fixed double-tap zoom not zooming to the correct spot on mobile",
      "Fixed zoom sometimes jumping to wrong position on desktop"
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Tampilan Foto: Klik untuk zoom sekarang mengikuti posisi mouse di desktop",
      "Tampilan Foto: Double-tap zoom di mobile sekarang zoom ke titik yang diketuk",
      "Tampilan Foto: Geser antar foto lebih halus dengan efek fade pada foto sebelah",
      "Tampilan Foto: Indikator level zoom sekarang menampilkan persentase dengan animasi",
      "Tampilan Foto: Foto yang sudah pernah dilihat langsung tampil tanpa loading",
      "Tampilan Foto: Foto baru tampil dengan efek fade-in yang halus setelah dimuat",
      "WhatsApp: Format nomor telepon lebih baik dengan dukungan 20+ kode negara"
    ]},
    {"category": "Peningkatan", "items": [
      "Tampilan Foto: Geser cepat sekarang lebih mulus tanpa gangguan visual",
      "Tampilan Foto: Foto tidak lagi terpotong di perangkat mobile",
      "Tampilan Foto: Pinch-to-zoom di mobile lebih halus tanpa getaran",
      "Tampilan Foto: Animasi zoom-out lebih halus dan natural",
      "Pengingat Telegram: Link WhatsApp sekarang menggunakan kode negara yang benar sesuai pengaturan project"
    ]},
    {"category": "Perbaikan", "items": [
      "Memperbaiki pengingat WhatsApp mengirim kode negara salah untuk nomor Indonesia yang dimulai 08xx",
      "Memperbaiki error loading yang kadang muncul saat melihat foto",
      "Memperbaiki double-tap zoom tidak zoom ke titik yang benar di mobile",
      "Memperbaiki zoom yang kadang melompat ke posisi yang salah di desktop"
    ]}
  ]'::jsonb
);
