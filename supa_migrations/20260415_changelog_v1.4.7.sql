-- Changelog v1.4.7 (15 Apr 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.7',
  '2026-04-15T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "Client links can now show photo selection, additional photos, print photos, and download in one place.",
      "Each photo in Download mode now has its own quick download button."
    ]},
    {"category": "Improvements", "items": [
      "Empty folders now stay visible so the album structure is easier to understand.",
      "Additional photo and print options are now easier to access from the same client link."
    ]},
    {"category": "Fixes", "items": [
      "Google Drive links that cannot be opened now show a clearer message.",
      "Older print links continue to work as before."
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Link klien sekarang bisa menampilkan Pilih Foto, Tambahan Foto, Cetak Foto, dan Download dalam satu tempat.",
      "Setiap foto di mode Download sekarang punya tombol download cepat sendiri."
    ]},
    {"category": "Peningkatan", "items": [
      "Folder kosong sekarang tetap ditampilkan agar susunan album lebih mudah dipahami.",
      "Opsi Tambahan Foto dan Cetak Foto sekarang lebih mudah diakses dari link klien yang sama."
    ]},
    {"category": "Perbaikan", "items": [
      "Link Google Drive yang tidak bisa dibuka sekarang menampilkan pesan yang lebih jelas.",
      "Link cetak lama tetap bisa dipakai seperti sebelumnya."
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
  changes_en = EXCLUDED.changes_en,
  changes_id = EXCLUDED.changes_id;
