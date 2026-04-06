-- Changelog v1.4.5 (06 Apr 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.5',
  '2026-04-06T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "Added a new default setting for Subfolder Detection in Fastpik Settings > Default Project.",
      "New projects can now automatically follow that default Subfolder Detection setting."
    ]},
    {"category": "Improvements", "items": [
      "ClientDesk sync with preset source \"Use Fastpik default\" now follows Fastpik default Subfolder Detection.",
      "ClientDesk sync response now includes the final detect_subfolders value so integrations can show the actual applied setting."
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Ditambahkan pengaturan default baru untuk Deteksi Subfolder di Fastpik (Pengaturan > Default Project).",
      "Project baru sekarang bisa otomatis mengikuti nilai default Deteksi Subfolder tersebut."
    ]},
    {"category": "Peningkatan", "items": [
      "Sinkronisasi dari ClientDesk dengan sumber preset \"Ikuti default Fastpik\" sekarang mengikuti default Deteksi Subfolder dari Fastpik.",
      "Respons sinkronisasi ClientDesk sekarang menyertakan nilai akhir detect_subfolders agar integrasi bisa menampilkan pengaturan yang benar-benar dipakai."
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
  changes_en = EXCLUDED.changes_en,
  changes_id = EXCLUDED.changes_id;
