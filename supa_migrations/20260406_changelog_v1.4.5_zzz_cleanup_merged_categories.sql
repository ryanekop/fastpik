-- Cleanup duplicate category groups/items for changelog v1.4.5
-- This keeps one category group per name and removes duplicate items in each category.

UPDATE changelogs AS c
SET
  changes_en = (
    WITH merged_groups AS (
      SELECT grp, grp_ord
      FROM jsonb_array_elements(COALESCE(c.changes_en, '[]'::jsonb))
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
      FROM jsonb_array_elements(COALESCE(c.changes_id, '[]'::jsonb))
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
  )
WHERE c.version = '1.4.5';
