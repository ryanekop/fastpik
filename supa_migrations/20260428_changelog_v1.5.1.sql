-- Changelog v1.5.1 (28 Apr 2026)
-- Follow-up to v1.5.0 default feature toggles
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.5.1',
  '2026-04-28T00:00:00.000Z',
  '[
    {"category": "Improvements", "items": [
      "Follow-up to v1.5.0: Max Photos is now only required when Select Photos is active.",
      "Projects that only use Download Photos or Print Photos can now be created without filling Max Photos.",
      "The dashboard now only shows photo quotas for menus that are actually active."
    ]},
    {"category": "Fixes", "items": [
      "Download-only and print-only projects no longer appear as pending Select Photos projects.",
      "ClientDesk, batch mode, and spreadsheet import now follow the same optional Max Photos behavior."
    ]}
  ]'::jsonb,
  '[
    {"category": "Peningkatan", "items": [
      "Lanjutan dari v1.5.0: Jumlah Foto sekarang hanya wajib diisi jika menu Pilih Foto aktif.",
      "Project yang hanya memakai Download Foto atau Cetak Foto sekarang bisa dibuat tanpa mengisi Jumlah Foto.",
      "Dashboard sekarang hanya menampilkan kuota foto untuk menu yang benar-benar aktif."
    ]},
    {"category": "Perbaikan", "items": [
      "Project khusus download atau khusus cetak tidak lagi muncul sebagai project Pilih Foto yang masih pending.",
      "ClientDesk, batch mode, dan import spreadsheet sekarang mengikuti aturan Jumlah Foto opsional yang sama."
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
  changes_en = EXCLUDED.changes_en,
  changes_id = EXCLUDED.changes_id;
