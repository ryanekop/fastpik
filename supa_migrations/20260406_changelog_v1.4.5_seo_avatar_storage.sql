-- Changelog v1.4.5 patch: include SEO settings + avatar storage migration
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.5',
  '2026-04-06T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "Added a new default setting for Subfolder Detection in Fastpik Settings > Default Project.",
      "New projects can now automatically follow that default Subfolder Detection setting.",
      "Added a new SEO tab in Settings (between General and Message Templates) to set Meta Title, Meta Description, and Keywords for client public pages.",
      "Client public page metadata now supports template variables and automatic fallback values when SEO fields are empty."
    ]},
    {"category": "Improvements", "items": [
      "ClientDesk sync with preset source \"Use Fastpik default\" now follows Fastpik default Subfolder Detection.",
      "ClientDesk sync response now includes the final detect_subfolders value so integrations can show the actual applied setting.",
      "Profile avatar uploads now use Supabase Storage URL instead of storing base64 image data in profile records.",
      "SEO image preview now prioritizes profile avatar and falls back to tenant logo automatically."
    ]},
    {"category": "Fixes", "items": [
      "Fixed mismatch between gallery order and opened photo viewer order, so photo navigation now follows the active gallery sort/folder.",
      "After saving project edits, the app now reliably returns to the dashboard list instead of reopening edit mode."
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Ditambahkan pengaturan default baru untuk Deteksi Subfolder di Fastpik (Pengaturan > Default Project).",
      "Project baru sekarang bisa otomatis mengikuti nilai default Deteksi Subfolder tersebut.",
      "Ditambahkan tab SEO baru di Pengaturan (di antara Umum dan Template Pesan) untuk mengatur Meta Title, Meta Description, dan Keywords halaman klien publik.",
      "Metadata halaman klien publik sekarang mendukung variabel template dan fallback otomatis saat kolom SEO dikosongkan."
    ]},
    {"category": "Peningkatan", "items": [
      "Sinkronisasi dari ClientDesk dengan sumber preset \"Ikuti default Fastpik\" sekarang mengikuti default Deteksi Subfolder dari Fastpik.",
      "Respons sinkronisasi ClientDesk sekarang menyertakan nilai akhir detect_subfolders agar integrasi bisa menampilkan pengaturan yang benar-benar dipakai.",
      "Upload avatar profil sekarang memakai Supabase Storage URL, bukan lagi menyimpan data gambar base64 langsung di data profil.",
      "Gambar preview SEO sekarang otomatis memprioritaskan avatar profil, lalu fallback ke logo tenant."
    ]},
    {"category": "Perbaikan", "items": [
      "Memperbaiki urutan foto antara galeri dan tampilan saat foto dibuka, jadi navigasi sekarang mengikuti urutan/folder yang sedang aktif di galeri.",
      "Setelah simpan perubahan saat edit project, tampilan sekarang langsung kembali ke daftar project di dashboard (tidak membuka form edit lagi)."
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
  changes_en = EXCLUDED.changes_en,
  changes_id = EXCLUDED.changes_id;
