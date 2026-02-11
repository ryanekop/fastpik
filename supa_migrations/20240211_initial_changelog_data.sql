-- Initial data for changelogs table
INSERT INTO changelogs (version, release_date, changes_en, changes_id)
VALUES
(
    '1.2.0',
    NOW(),
    '[
        {"category": "Features", "items": [
            "Added \"Extra Photos\" badge for additional selection projects",
            "Added password and duration variables to WhatsApp message templates",
            "Added countdown timer banner for expiring links in client view",
            "Added comprehensive changelog system and \"What''s New\" popup"
        ]},
        {"category": "Fixes", "items": [
            "Fixed bug where clearing selection incorrectly removed locked photos",
            "Fixed missing translation for badge text"
        ]}
    ]'::jsonb,
    '[
        {"category": "Fitur", "items": [
            "Menambahkan badge \"Tambahan Foto\" untuk proyek pemilihan tambahan",
            "Menambahkan variabel password dan durasi pada template pesan WhatsApp",
            "Menambahkan banner hitung mundur untuk link yang akan kadaluarsa di tampilan klien",
            "Menambahkan sistem changelog lengkap dan popup \"Apa yang Baru\""
        ]},
        {"category": "Perbaikan", "items": [
            "Memperbaiki bug di mana menghapus pilihan secara tidak sengaja menghapus foto yang terkunci",
            "Memperbaiki terjemahan yang hilang untuk teks badge"
        ]}
    ]'::jsonb
),
(
    '1.1.0',
    NOW() - INTERVAL '1 day',
    '[
        {"category": "Features", "items": [
            "Implemented orange card styling for \"Extra Photo\" projects",
            "Reverted to single password system for simpler access control",
            "Restored full-page password wall for protected albums"
        ]},
        {"category": "Changes", "items": [
            "Removed separate photo selection password",
            "Updated project creation form configuration"
        ]}
    ]'::jsonb,
    '[
        {"category": "Fitur", "items": [
            "Mengimplementasikan gaya kartu oranye untuk proyek \"Foto Tambahan\"",
            "Mengembalikan sistem satu password untuk akses yang lebih sederhana",
            "Mengembalikan halaman password penuh untuk album yang dilindungi"
        ]},
        {"category": "Perubahan", "items": [
            "Menghapus password khusus pemilihan foto",
            "Memperbarui konfigurasi formulir pembuatan proyek"
        ]}
    ]'::jsonb
),
(
    '1.0.0',
    NOW() - INTERVAL '7 days',
    '[
        {"category": "Initial Release", "items": [
            "Core photo selection functionality",
            "Google Drive integration for photo storage",
            "WhatsApp integration for sending links and results",
            "Project management dashboard",
            "Password protection support",
            "Download original photos feature"
        ]}
    ]'::jsonb,
    '[
        {"category": "Rilis Awal", "items": [
            "Fungsi utama pemilihan foto",
            "Integrasi Google Drive untuk penyimpanan foto",
            "Integrasi WhatsApp untuk mengirim link dan hasil",
            "Dashboard manajemen proyek",
            "Dukungan perlindungan password",
            "Fitur download foto asli"
        ]}
    ]'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
    changes_en = EXCLUDED.changes_en,
    changes_id = EXCLUDED.changes_id,
    release_date = EXCLUDED.release_date;
