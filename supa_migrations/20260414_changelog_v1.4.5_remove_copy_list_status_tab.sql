-- Remove copy-list status tab changelog items from v1.4.5

UPDATE changelogs AS c
SET
  changes_en = (
    WITH groups AS (
      SELECT grp, grp_ord
      FROM jsonb_array_elements(COALESCE(c.changes_en, '[]'::jsonb))
      WITH ORDINALITY AS source(grp, grp_ord)
    ),
    filtered AS (
      SELECT
        grp->>'category' AS category,
        grp_ord,
        (
          SELECT jsonb_agg(item.value ORDER BY item_ord)
          FROM jsonb_array_elements_text(COALESCE(grp->'items', '[]'::jsonb))
          WITH ORDINALITY AS item(value, item_ord)
          WHERE item.value NOT IN (
            'New "Copy List" button in Client Status to quickly copy the client photo choices.',
            'For extra-photo projects, copied lists are now split into Previous Photos and Additional Photos so they are easier to read.'
          )
        ) AS items
      FROM groups
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object('category', category, 'items', items)
        ORDER BY grp_ord
      ) FILTER (WHERE items IS NOT NULL AND jsonb_array_length(items) > 0),
      '[]'::jsonb
    )
    FROM filtered
  ),
  changes_id = (
    WITH groups AS (
      SELECT grp, grp_ord
      FROM jsonb_array_elements(COALESCE(c.changes_id, '[]'::jsonb))
      WITH ORDINALITY AS source(grp, grp_ord)
    ),
    filtered AS (
      SELECT
        grp->>'category' AS category,
        grp_ord,
        (
          SELECT jsonb_agg(item.value ORDER BY item_ord)
          FROM jsonb_array_elements_text(COALESCE(grp->'items', '[]'::jsonb))
          WITH ORDINALITY AS item(value, item_ord)
          WHERE item.value NOT IN (
            'Ada tombol baru "Salin Daftar" di Status Klien untuk menyalin pilihan foto klien dengan cepat.',
            'Untuk project foto tambahan, hasil salinan sekarang dipisah jadi Foto Sebelumnya dan Foto Tambahan supaya lebih mudah dibaca.'
          )
        ) AS items
      FROM groups
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object('category', category, 'items', items)
        ORDER BY grp_ord
      ) FILTER (WHERE items IS NOT NULL AND jsonb_array_length(items) > 0),
      '[]'::jsonb
    )
    FROM filtered
  )
WHERE c.version = '1.4.5';
