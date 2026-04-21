-- Changelog v1.5.0 (21 Apr 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.5.0',
  '2026-04-21T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "Project defaults can now turn Select Photos, Download Photos, Additional Photos, and Print Photos on or off automatically.",
      "Additional Photo and Print Photo link durations can now use custom month and day values."
    ]},
    {"category": "Improvements", "items": [
      "New projects from manual create, batch mode, spreadsheet import, and ClientDesk now follow the saved defaults.",
      "Admins no longer need to click the same feature toggles again for every new project."
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Default project sekarang bisa otomatis menyalakan atau mematikan menu Pilih Foto, Download Foto, Tambahan Foto, dan Cetak Foto.",
      "Durasi link Tambahan Foto dan Cetak Foto sekarang bisa dibuat custom dengan bulan dan hari."
    ]},
    {"category": "Peningkatan", "items": [
      "Project baru dari form biasa, batch, import spreadsheet, dan ClientDesk sekarang mengikuti default yang sudah disimpan.",
      "Admin tidak perlu klik toggle fitur yang sama berulang kali untuk setiap project baru."
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
  changes_en = EXCLUDED.changes_en,
  changes_id = EXCLUDED.changes_id;
