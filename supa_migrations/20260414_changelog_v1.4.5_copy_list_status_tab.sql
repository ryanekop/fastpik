-- Changelog v1.4.5 patch: add copy list action in Client Status (append only)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.5',
  '2026-04-06T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "New \"Copy List\" button in Client Status to quickly copy the client photo choices."
    ]},
    {"category": "Improvements", "items": [
      "For extra-photo projects, copied lists are now split into Previous Photos and Additional Photos so they are easier to read."
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Ada tombol baru \"Salin Daftar\" di Status Klien untuk menyalin pilihan foto klien dengan cepat."
    ]},
    {"category": "Peningkatan", "items": [
      "Untuk project foto tambahan, hasil salinan sekarang dipisah jadi Foto Sebelumnya dan Foto Tambahan supaya lebih mudah dibaca."
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  changes_en = (
    WITH merged_groups AS (
      SELECT grp, grp_ord
      FROM jsonb_array_elements(COALESCE(changelogs.changes_en, '[]'::jsonb) || COALESCE(EXCLUDED.changes_en, '[]'::jsonb))
      WITH ORDINALITY AS source(grp, grp_ord)
    ),
    merged_items AS (
      SELECT
        grp->>'category' AS category,
        item.value AS item,
        grp_ord,
        ((grp_ord - 1) * 10000 + item.item_ord) AS item_pos
      FROM merged_groups
      CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(grp->'items', '[]'::jsonb))
      WITH ORDINALITY AS item(value, item_ord)
    ),
    dedup_items AS (
      SELECT
        category,
        item,
        MIN(grp_ord) AS first_group_pos,
        MIN(item_pos) AS first_item_pos
      FROM merged_items
      GROUP BY category, item
    ),
    grouped AS (
      SELECT
        category,
        MIN(first_group_pos) AS category_pos,
        jsonb_agg(item ORDER BY first_item_pos) AS items
      FROM dedup_items
      GROUP BY category
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object('category', category, 'items', items)
        ORDER BY category_pos
      ),
      '[]'::jsonb
    )
    FROM grouped
  ),
  changes_id = (
    WITH merged_groups AS (
      SELECT grp, grp_ord
      FROM jsonb_array_elements(COALESCE(changelogs.changes_id, '[]'::jsonb) || COALESCE(EXCLUDED.changes_id, '[]'::jsonb))
      WITH ORDINALITY AS source(grp, grp_ord)
    ),
    merged_items AS (
      SELECT
        grp->>'category' AS category,
        item.value AS item,
        grp_ord,
        ((grp_ord - 1) * 10000 + item.item_ord) AS item_pos
      FROM merged_groups
      CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(grp->'items', '[]'::jsonb))
      WITH ORDINALITY AS item(value, item_ord)
    ),
    dedup_items AS (
      SELECT
        category,
        item,
        MIN(grp_ord) AS first_group_pos,
        MIN(item_pos) AS first_item_pos
      FROM merged_items
      GROUP BY category, item
    ),
    grouped AS (
      SELECT
        category,
        MIN(first_group_pos) AS category_pos,
        jsonb_agg(item ORDER BY first_item_pos) AS items
      FROM dedup_items
      GROUP BY category
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object('category', category, 'items', items)
        ORDER BY category_pos
      ),
      '[]'::jsonb
    )
    FROM grouped
  );
