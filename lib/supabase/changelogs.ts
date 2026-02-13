
import { createClient } from './server'

export interface ChangelogItem {
    category: string
    items: string[]
}

export interface Changelog {
    id: string
    version: string
    releaseDate: string
    changes: ChangelogItem[]
}

const FALLBACK_CHANGELOGS = [
    {
        id: 'v122',
        version: '1.2.2',
        release_date: '2026-02-13T00:00:00.000Z',
        changes_en: [
            {
                category: "Features", items: [
                    "Separate link duration for photo selection and download modes",
                ]
            },
            {
                category: "Improvements", items: [
                    "Photos and folders now display side-by-side in the same grid for a cleaner layout",
                    "Responsive folder cards — smaller icon and text on mobile devices",
                ]
            },
            {
                category: "Fixes", items: [
                    "Added confirmation popup before clearing selection in download mode",
                    "Fixed WhatsApp templates to correctly include password and remaining time for photo selection",
                    "Fixed link duration edit when set to 'Forever'",
                ]
            }
        ],
        changes_id: [
            {
                category: "Fitur", items: [
                    "Durasi link terpisah untuk mode pilih foto dan download foto",
                ]
            },
            {
                category: "Peningkatan", items: [
                    "Foto dan folder sekarang ditampilkan berdampingan dalam satu grid agar lebih rapi",
                    "Folder card responsif — ikon dan teks lebih kecil di perangkat mobile",
                ]
            },
            {
                category: "Perbaikan", items: [
                    "Menambahkan popup konfirmasi sebelum menghapus pilihan di mode download",
                    "Memperbaiki template WhatsApp agar menyertakan password dan sisa waktu pilih foto dengan benar",
                    "Memperbaiki edit durasi link saat diset ke 'Selamanya'",
                ]
            }
        ]
    },
    {
        id: '0',
        version: '1.2.1',
        release_date: '2026-02-12T00:00:00.000Z',
        changes_en: [
            {
                category: "Features", items: [
                    "Customizable WhatsApp reminder templates in settings",
                    "Expanded action area in dashboard for desktop view",
                    "Confirmation dialog for \"Download All\" feature"
                ]
            },
            {
                category: "Improvements", items: [
                    "Standardized all template variables to use {{count}}",
                    "Removed problematic emojis from default templates"
                ]
            },
            {
                category: "Fixes", items: [
                    "Fixed bug where project expiry was not cleared when set to 'Forever'"
                ]
            }
        ],
        changes_id: [
            {
                category: "Fitur", items: [
                    "Template pengingat WhatsApp yang dapat disesuaikan di pengaturan",
                    "Area dashboard lebih lebar untuk tampilan desktop",
                    "Dialog konfirmasi sebelum \"Download Semua\""
                ]
            },
            {
                category: "Peningkatan", items: [
                    "Standardisasi semua variabel template menjadi {{count}}",
                    "Menghapus emoji bermasalah dari template default"
                ]
            },
            {
                category: "Perbaikan", items: [
                    "Memperbaiki bug di mana durasi proyek tidak terhapus saat diset 'Selamanya'"
                ]
            }
        ]
    },
    {
        id: '1',
        version: '1.2.0',
        release_date: '2026-02-11T00:00:00.000Z',
        changes_en: [
            {
                category: "Features", items: [
                    "Added \"Extra Photos\" badge for additional selection projects",
                    "Added password and duration variables to WhatsApp message templates",
                    "Added countdown timer banner for expiring links in client view",
                    "Added changelog system and \"What's New\" popup"
                ]
            },
            {
                category: "Fixes", items: [
                    "Fixed clearing selection incorrectly removed locked photos",
                    "Fixed missing translation for badge text"
                ]
            }
        ],
        changes_id: [
            {
                category: "Fitur", items: [
                    "Menambahkan badge \"Tambahan Foto\" untuk proyek pemilihan tambahan",
                    "Menambahkan variabel password dan durasi pada template pesan WhatsApp",
                    "Menambahkan banner hitung mundur untuk link yang akan kadaluarsa",
                    "Menambahkan sistem changelog dan popup \"Apa yang Baru\""
                ]
            },
            {
                category: "Perbaikan", items: [
                    "Memperbaiki hapus pilihan yang menghapus foto terkunci",
                    "Memperbaiki terjemahan badge yang hilang"
                ]
            }
        ]
    },
    {
        id: '2',
        version: '1.1.0',
        release_date: new Date(Date.now() - 86400000).toISOString(),
        changes_en: [
            {
                category: "Features", items: [
                    "Implemented orange card styling for \"Extra Photo\" projects",
                    "Reverted to single password system for simpler access control",
                    "Restored full-page password wall for protected albums"
                ]
            },
            {
                category: "Changes", items: [
                    "Removed separate photo selection password",
                    "Updated project creation form configuration"
                ]
            }
        ],
        changes_id: [
            {
                category: "Fitur", items: [
                    "Mengimplementasikan gaya kartu oranye untuk proyek \"Foto Tambahan\"",
                    "Mengembalikan sistem satu password untuk akses yang lebih sederhana",
                    "Mengembalikan halaman password penuh untuk album yang dilindungi"
                ]
            },
            {
                category: "Perubahan", items: [
                    "Menghapus password khusus pemilihan foto",
                    "Memperbarui konfigurasi formulir pembuatan proyek"
                ]
            }
        ]
    },
    {
        id: '3',
        version: '1.0.0',
        release_date: new Date(Date.now() - 604800000).toISOString(),
        changes_en: [
            {
                category: "Initial Release", items: [
                    "Core photo selection functionality",
                    "Google Drive integration for photo storage",
                    "WhatsApp integration for sending links and results",
                    "Project management dashboard",
                    "Password protection support",
                    "Download original photos feature"
                ]
            }
        ],
        changes_id: [
            {
                category: "Rilis Awal", items: [
                    "Fungsi utama pemilihan foto",
                    "Integrasi Google Drive untuk penyimpanan foto",
                    "Integrasi WhatsApp untuk mengirim link dan hasil",
                    "Dashboard manajemen proyek",
                    "Dukungan perlindungan password",
                    "Fitur download foto asli"
                ]
            }
        ]
    }
]

export async function getChangelogs(locale: string = 'id'): Promise<Changelog[]> {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('changelogs')
            .select('*')
            .order('release_date', { ascending: false })

        if (error || !data || data.length === 0) {
            console.log("Using fallback changelog data")
            return FALLBACK_CHANGELOGS.map((item: any) => ({
                id: item.id,
                version: item.version,
                releaseDate: item.release_date,
                changes: locale === 'en' ? item.changes_en : item.changes_id
            }))
        }

        return data.map((item: any) => ({
            id: item.id,
            version: item.version,
            releaseDate: item.release_date,
            changes: locale === 'en' ? item.changes_en : item.changes_id
        }))
    } catch (err) {
        console.error("Failed to fetch changelogs:", err)
        return FALLBACK_CHANGELOGS.map((item: any) => ({
            id: item.id,
            version: item.version,
            releaseDate: item.release_date,
            changes: locale === 'en' ? item.changes_en : item.changes_id
        }))
    }
}


export async function getLatestChangelog(locale: string = 'id'): Promise<Changelog | null> {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('changelogs')
            .select('*')
            .order('release_date', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error || !data) {
            // Use fallback
            const latest = FALLBACK_CHANGELOGS[0]
            return {
                id: latest.id,
                version: latest.version,
                releaseDate: latest.release_date,
                changes: locale === 'en' ? latest.changes_en : latest.changes_id
            }
        }

        return {
            id: data.id,
            version: data.version,
            releaseDate: data.release_date,
            changes: locale === 'en' ? data.changes_en : data.changes_id
        }
    } catch (err) {
        console.error("Failed to fetch latest changelog:", err)
        const latest = FALLBACK_CHANGELOGS[0]
        return {
            id: latest.id,
            version: latest.version,
            releaseDate: latest.release_date,
            changes: locale === 'en' ? latest.changes_en : latest.changes_id
        }
    }
}
