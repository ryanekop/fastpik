-- Changelog v1.4.8 (16 Apr 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.8',
  '2026-04-16T00:00:00.000Z',
  '[
    {"category": "Improvements", "items": [
      "Project action buttons now feel more stable when the dashboard first opens.",
      "Client links are prepared more safely before WhatsApp and copy actions are used."
    ]},
    {"category": "Fixes", "items": [
      "Fixed WhatsApp buttons sometimes opening the project edit page when clicked too quickly.",
      "Fixed a dashboard error when SEO placeholder examples were shown."
    ]}
  ]'::jsonb,
  '[
    {"category": "Peningkatan", "items": [
      "Tombol aksi project sekarang lebih stabil saat dashboard baru dibuka.",
      "Link klien disiapkan lebih aman sebelum dipakai untuk WhatsApp dan salin link."
    ]},
    {"category": "Perbaikan", "items": [
      "Memperbaiki tombol WhatsApp yang kadang membuka edit project saat diklik terlalu cepat.",
      "Memperbaiki error dashboard saat contoh placeholder SEO ditampilkan."
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
  changes_en = EXCLUDED.changes_en,
  changes_id = EXCLUDED.changes_id;
