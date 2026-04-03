-- Changelog v1.4.4 (03 Apr 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.4',
  '2026-04-03T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "A Reload button is now available on the client page to manually check the latest photos."
    ]},
    {"category": "Improvements", "items": [
      "Reload now has a short cooldown to avoid repeated taps and keep the process stable.",
      "Photo detection from Shared Drive folders is now more consistent."
    ]},
    {"category": "Fixes", "items": [
      "Domain promo and What''s New popups now appear only on the main dashboard page."
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Tombol Muat Ulang (Reload) sekarang tersedia di halaman klien untuk cek foto terbaru secara manual."
    ]},
    {"category": "Peningkatan", "items": [
      "Muat ulang sekarang memakai jeda singkat agar tidak kepencet berulang dan proses tetap stabil.",
      "Deteksi foto dari Shared Drive (Drive bersama) sekarang lebih konsisten."
    ]},
    {"category": "Perbaikan", "items": [
      "Popup Domain dan Apa yang Baru sekarang hanya muncul di dashboard utama."
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
  changes_en = EXCLUDED.changes_en,
  changes_id = EXCLUDED.changes_id;
