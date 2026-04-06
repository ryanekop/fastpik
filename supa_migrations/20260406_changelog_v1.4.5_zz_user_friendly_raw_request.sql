-- Changelog v1.4.5 patch (append only, do not replace existing entries)
INSERT INTO changelogs (version, release_date, changes_en, changes_id) VALUES (
  '1.4.5',
  '2026-04-06T00:00:00.000Z',
  '[
    {"category": "Features", "items": [
      "New RAW Request flow in Client Status: click \"Request RAW\", choose one freelancer, then send WhatsApp directly.",
      "New RAW request WhatsApp template in Message Templates."
    ]},
    {"category": "Improvements", "items": [
      "Freelancer data from ClientDesk is now saved as project snapshot (up to 5 people) for quick RAW request targeting."
    ]}
  ]'::jsonb,
  '[
    {"category": "Fitur", "items": [
      "Ada alur baru Minta RAW di Status Klien: klik \"Minta RAW\", pilih 1 freelance, lalu kirim WhatsApp langsung.",
      "Ada template WhatsApp baru khusus untuk pesan Request RAW di Template Pesan."
    ]},
    {"category": "Peningkatan", "items": [
      "Data freelance dari ClientDesk sekarang disimpan sebagai snapshot per project (maks 5 orang) supaya lebih cepat saat kirim request RAW."
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
