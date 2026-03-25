-- Changelog v1.4.3 (25 Mar 2026)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.3',
  '2026-03-25T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "Custom Domain promo modal now includes a one-time payment note that applies to both Fastpik and Client Desk",
      "Custom Domain detail page now shows the same cross-product one-time payment information in the pricing section"
    ]},
    {"category": "Improvements", "items": [
      "Pricing communication is now consistent at Rp 150.000 with crossed-out Rp 200.000 across promo and detail page"
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Popup promo Custom Domain sekarang menampilkan keterangan sekali bayar yang berlaku untuk Fastpik dan Client Desk",
      "Halaman detail Custom Domain sekarang menampilkan informasi sekali bayar lintas produk pada bagian harga"
    ]},
    {"category": "Peningkatan", "items": [
      "Komunikasi harga kini konsisten: Rp 150.000 dengan harga coret Rp 200.000 di popup dan halaman detail"
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
  changes_en = EXCLUDED.changes_en,
  changes_id = EXCLUDED.changes_id;
