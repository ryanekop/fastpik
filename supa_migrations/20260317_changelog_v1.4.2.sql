-- Changelog v1.4.2 (17 Mar 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.2',
  '2026-03-17T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "New ClientDesk integration tab in Settings with connection status, API key rotation, and last sync log",
      "New integration endpoints for ClientDesk: ping and idempotent upsert by source reference",
      "Projects synced from ClientDesk are now created in root and linked with source metadata for deduplication"
    ]},
    {"category": "Improvements", "items": [
      "ClientDesk sync now updates only core fields on existing projects to keep manual Fastpik preset settings unchanged",
      "Sync logging is now more explicit with statuses: idle, syncing, success, warning, and failed"
    ]},
    {"category": "Fixes", "items": [
      "Improved API key validation response handling for integration routes"
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Tab integrasi ClientDesk baru di Pengaturan dengan status koneksi, rotasi API key, dan log sinkron terakhir",
      "Endpoint integrasi baru untuk ClientDesk: ping dan upsert idempoten berdasarkan source reference",
      "Project hasil sinkron ClientDesk sekarang dibuat di root dan ditandai metadata source untuk mencegah duplikat"
    ]},
    {"category": "Peningkatan", "items": [
      "Sinkron ClientDesk sekarang hanya memperbarui field inti pada project yang sudah ada agar preset manual Fastpik tidak tertimpa",
      "Pencatatan sinkron lebih jelas dengan status: idle, syncing, success, warning, dan failed"
    ]},
    {"category": "Perbaikan", "items": [
      "Peningkatan penanganan respons validasi API key pada route integrasi"
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
  changes_en = EXCLUDED.changes_en,
  changes_id = EXCLUDED.changes_id;
