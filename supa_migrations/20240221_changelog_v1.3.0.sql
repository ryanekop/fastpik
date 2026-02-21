-- Changelog v1.3.0 (21 Feb 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.3.0',
  '2026-02-21T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "New \"Review Mode\" — review selected photos in a gallery view before sending to admin",
      "New \"Client Status\" tab on dashboard — monitor client selection progress in real-time with auto-refresh",
      "Mark selections as \"Reviewed\" or undo review status, saved to database",
      "Real-time photo selection sync between client and admin dashboard",
      "Send reminder to client via WhatsApp directly from client status tab"
    ]},
    {"category": "Improvements", "items": [
      "\"Send to WhatsApp\" and \"Copy Template\" buttons after creating a project now follow custom templates from Settings",
      "Reminder button in all locations (project list, client status) now consistently uses custom templates",
      "Client status cards colored by status — red (not selected), yellow (selecting), green (reviewed)",
      "Dashboard tab icons replaced with SVG icons for cleaner UI",
      "Review gallery matches photo grid style with 4:3 aspect ratio and zoom overlay"
    ]},
    {"category": "Fixes", "items": [
      "Fixed popup dialog closing on backdrop click incorrectly triggering confirm action",
      "Fixed password verification moved to server-side to prevent exposure in client inspect",
      "Fixed extra photos WhatsApp template not following custom template from Settings"
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Mode \"Review Pilihan\" baru — review foto yang dipilih dalam tampilan galeri sebelum mengirim ke admin",
      "Tab \"Status Klien\" baru di dashboard — pantau progres pemilihan klien secara real-time dengan auto-refresh",
      "Tandai pilihan sebagai \"Sudah Ditinjau\" atau batalkan tinjauan, tersimpan ke database",
      "Sinkronisasi pemilihan foto real-time antara klien dan dashboard admin",
      "Kirim pengingat ke klien via WhatsApp langsung dari tab status klien"
    ]},
    {"category": "Peningkatan", "items": [
      "Tombol \"Kirim ke WhatsApp\" dan \"Salin Template\" setelah membuat project sekarang mengikuti template dari Pengaturan",
      "Tombol pengingat di semua lokasi (daftar project, status klien) sekarang konsisten menggunakan template custom",
      "Kartu status klien diwarnai sesuai status — merah (belum memilih), kuning (sedang memilih), hijau (sudah ditinjau)",
      "Ikon tab dashboard diganti dengan ikon SVG yang lebih bersih",
      "Galeri review mengikuti gaya grid foto dengan rasio 4:3 dan overlay zoom"
    ]},
    {"category": "Perbaikan", "items": [
      "Memperbaiki dialog popup yang menutup saat klik di luar salah memicu aksi konfirmasi",
      "Memperbaiki verifikasi password dipindahkan ke sisi server untuk mencegah terlihat di inspect element",
      "Memperbaiki template WhatsApp foto tambahan yang tidak mengikuti template custom dari Pengaturan"
    ]}
  ]'::jsonb
);
