-- Changelog v1.2.1
INSERT INTO changelogs (version, release_date, changes_en, changes_id)
VALUES
(
    '1.2.1',
    NOW(),
    '[
        {"category": "Features", "items": [
            "Added project folder system with up to 5-level nesting",
            "Added drag & drop support for moving projects and folders",
            "Added breadcrumb navigation for folder hierarchy",
            "Added sort by expiry dropdown with selection/download and ascending/descending options",
            "Added dashboard setting to choose which link duration to display (selection or download)"
        ]},
        {"category": "Fixes", "items": [
            "Fixed bug where editing a project would reset unchanged link durations to forever",
            "Standardized template variables from {{max_photos}} to {{count}}"
        ]}
    ]'::jsonb,
    '[
        {"category": "Fitur", "items": [
            "Menambahkan sistem folder proyek dengan nesting hingga 5 level",
            "Menambahkan drag & drop untuk memindahkan proyek dan folder",
            "Menambahkan navigasi breadcrumb untuk hierarki folder",
            "Menambahkan dropdown urutkan berdasarkan expired dengan pilihan durasi pilih/download dan ascending/descending",
            "Menambahkan pengaturan dashboard untuk memilih durasi link yang ditampilkan (pilih foto atau download)"
        ]},
        {"category": "Perbaikan", "items": [
            "Memperbaiki bug di mana mengedit proyek mereset durasi link yang tidak diubah ke selamanya",
            "Menstandarisasi variabel template dari {{max_photos}} ke {{count}}"
        ]}
    ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
    changes_en = EXCLUDED.changes_en,
    changes_id = EXCLUDED.changes_id,
    release_date = EXCLUDED.release_date;
