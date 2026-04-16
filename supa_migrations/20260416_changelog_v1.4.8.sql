-- Changelog v1.4.8 (16 Apr 2026)
-- Append only: keep existing changelog text and add missing items.
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.8',
  '2026-04-16T00:00:00.000Z',
  '[
    {"category": "Improvements", "items": [
      "Project buttons are more stable when the dashboard opens.",
      "Client links are safer for WhatsApp and copy actions."
    ]},
    {"category": "Fixes", "items": [
      "WhatsApp buttons no longer open the edit page when clicked quickly.",
      "Admin WhatsApp button on the client page opens normally again.",
      "SEO placeholder examples no longer cause dashboard errors."
    ]}
  ]'::jsonb,
  '[
    {"category": "Peningkatan", "items": [
      "Tombol project lebih stabil saat dashboard dibuka.",
      "Link klien lebih aman untuk WhatsApp dan salin link."
    ]},
    {"category": "Perbaikan", "items": [
      "Tombol WhatsApp tidak lagi membuka halaman edit saat diklik cepat.",
      "Tombol WhatsApp Admin di halaman klien bisa dibuka normal lagi.",
      "Contoh placeholder SEO tidak lagi membuat dashboard error."
    ]}
  ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  release_date = EXCLUDED.release_date,
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
