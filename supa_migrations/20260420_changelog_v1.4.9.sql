-- Changelog v1.4.9 (20 Apr 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.9',
  '2026-04-20T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "Client links can now show only the menus you need: select photos, download photos, additional photos, and print photos.",
      "Copy and WhatsApp buttons now have clearer options for client links, additional photos, print photos, and freelancers."
    ]},
    {"category": "Improvements", "items": [
      "Project buttons are cleaner and easier to use on desktop and mobile.",
      "Success and error messages are clearer, shorter, and easier to notice.",
      "The client start page now uses a clearer additional photo label and icon."
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Link klien sekarang bisa menampilkan menu sesuai kebutuhan: pilih foto, download foto, pilih foto tambahan, dan pilih foto cetak.",
      "Tombol Copy dan WhatsApp sekarang punya pilihan pesan yang lebih jelas untuk klien, foto tambahan, cetak, dan freelancer."
    ]},
    {"category": "Peningkatan", "items": [
      "Tombol project lebih rapi dan lebih nyaman dipakai di desktop maupun HP.",
      "Pesan berhasil dan gagal sekarang lebih jelas, lebih singkat, dan lebih mudah terlihat.",
      "Halaman awal klien sekarang memakai label dan ikon foto tambahan yang lebih jelas."
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
  changes_en = EXCLUDED.changes_en,
  changes_id = EXCLUDED.changes_id;
