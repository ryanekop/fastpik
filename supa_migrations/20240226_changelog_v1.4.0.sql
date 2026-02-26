-- Changelog v1.4.0 (26 Feb 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.0',
  '2026-02-26T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "New \"Print Photo Selection\" feature — clients can select photos for print orders with configurable sizes and quotas",
      "New \"Print Client Status\" tab on dashboard — monitor print selection progress with per-size progress bars, selected photo names, and last synced time",
      "Print project support in Batch Mode (manual form) — toggle print type, set print sizes and print expiry per row",
      "Print project support in Batch Import (Excel) — projectType and printSizes columns in template and preview",
      "Real-time print selection sync — client selections auto-sync to server every 2 seconds",
      "Send WhatsApp reminder for print projects using custom template from Settings"
    ]},
    {"category": "Improvements", "items": [
      "Print templates in message template editor with purple color coding for easy distinction",
      "Print status notification badge (purple) on dashboard tab showing active print selections count",
      "Reminder button enabled for print projects in project list (checks printExpiresAt)",
      "Print reminder in status tab now follows custom reminder template from Settings",
      "All print-related UI features properly gated behind print_enabled setting toggle",
      "Header icon spacing adjusted for consistency across admin and client views"
    ]},
    {"category": "Fixes", "items": [
      "Fixed print selection sync API data format — flattened from nested to flat structure for correct display",
      "Fixed mark-reviewed API to correctly update print_status for print projects",
      "Fixed unmark-reviewed for print projects using POST instead of unsupported DELETE",
      "Fixed print status tab icon from eye to printer to match dashboard tab"
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Fitur \"Pemilihan Foto Cetak\" baru — klien dapat memilih foto untuk pesanan cetak dengan ukuran dan kuota yang dapat dikonfigurasi",
      "Tab \"Status Klien Cetak\" baru di dashboard — pantau progres pemilihan cetak dengan progress bar per ukuran, nama foto terpilih, dan waktu sync terakhir",
      "Dukungan project cetak di Batch Mode (form manual) — toggle tipe cetak, atur ukuran cetak dan durasi cetak per baris",
      "Dukungan project cetak di Batch Import (Excel) — kolom projectType dan printSizes di template dan preview",
      "Sinkronisasi pemilihan cetak real-time — pilihan klien otomatis sync ke server setiap 2 detik",
      "Kirim pengingat WhatsApp untuk project cetak menggunakan template custom dari Pengaturan"
    ]},
    {"category": "Peningkatan", "items": [
      "Template cetak di editor template pesan dengan kode warna ungu untuk membedakan dengan mudah",
      "Badge notifikasi status cetak (ungu) di tab dashboard menampilkan jumlah pemilihan cetak aktif",
      "Tombol pengingat aktif untuk project cetak di daftar project (mengecek printExpiresAt)",
      "Pengingat cetak di tab status sekarang mengikuti template pengingat dari Pengaturan",
      "Semua fitur UI cetak terkontrol dengan toggle print_enabled di pengaturan",
      "Jarak ikon header disesuaikan untuk konsistensi di tampilan admin dan klien"
    ]},
    {"category": "Perbaikan", "items": [
      "Memperbaiki format data API sinkronisasi cetak — diratakan dari format bersarang ke format datar untuk tampilan yang benar",
      "Memperbaiki API mark-reviewed agar memperbarui print_status dengan benar untuk project cetak",
      "Memperbaiki unmark-reviewed untuk project cetak menggunakan POST alih-alih DELETE yang tidak didukung",
      "Memperbaiki ikon tab status cetak dari mata ke printer agar sesuai dengan tab dashboard"
    ]}
  ]'::jsonb
);
