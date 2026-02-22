
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
        id: 'v130',
        version: '1.3.0',
        release_date: '2026-02-22T00:00:00.000Z',
        changes_en: [
            {
                category: "Features", items: [
                    "New \"Batch Mode\" — create multiple projects at once using a spreadsheet-style form",
                    "New \"Import from File\" — import projects from CSV or Excel files",
                    "New \"Review Mode\" — review selected photos in a gallery view before sending to admin",
                    "New \"Client Status\" tab on dashboard — monitor client selection progress in real-time with auto-refresh",
                    "New \"Telegram Bot\" auto-reminder — get notified when projects are nearing expiry via Telegram",
                    "Mark selections as \"Reviewed\" or undo review status, saved to database",
                    "Real-time photo selection sync between client and admin dashboard",
                    "Send reminder to client via WhatsApp directly from client status tab",
                ]
            },
            {
                category: "Improvements", items: [
                    "Emoji in WhatsApp message templates now fully supported on all platforms (Desktop, iOS, Android)",
                    "\"Send to WhatsApp\" and \"Copy Template\" buttons after creating a project now follow custom templates from Settings",
                    "Reminder button in all locations (project list, client status) now consistently uses custom templates",
                    "Client status cards colored by status — red (not selected), yellow (selecting), green (reviewed)",
                    "Dashboard tab icons replaced with SVG icons for cleaner UI",
                    "Review gallery matches photo grid style with 4:3 aspect ratio and zoom overlay",
                    "New \"Bot Telegram\" tab in Settings with visual step-by-step setup guide",
                ]
            },
            {
                category: "Fixes", items: [
                    "Fixed emoji corruption in WhatsApp messages on Desktop by switching to direct WhatsApp API",
                    "Fixed popup dialog closing on backdrop click incorrectly triggering confirm action",
                    "Fixed password verification moved to server-side to prevent exposure in client inspect",
                    "Fixed extra photos WhatsApp template not following custom template from Settings",
                ]
            }
        ],
        changes_id: [
            {
                category: "Fitur", items: [
                    "\"Batch Mode\" baru — buat banyak project sekaligus menggunakan form ala spreadsheet",
                    "\"Import dari File\" baru — import project dari file CSV atau Excel",
                    "Mode \"Review Pilihan\" baru — review foto yang dipilih dalam tampilan galeri sebelum mengirim ke admin",
                    "Tab \"Status Klien\" baru di dashboard — pantau progres pemilihan klien secara real-time dengan auto-refresh",
                    "Bot Telegram auto-reminder baru — dapatkan notifikasi saat project mendekati expired via Telegram",
                    "Tandai pilihan sebagai \"Sudah Ditinjau\" atau batalkan tinjauan, tersimpan ke database",
                    "Sinkronisasi pemilihan foto real-time antara klien dan dashboard admin",
                    "Kirim pengingat ke klien via WhatsApp langsung dari tab status klien",
                ]
            },
            {
                category: "Peningkatan", items: [
                    "Emoji di template pesan WhatsApp sekarang didukung penuh di semua platform (Desktop, iOS, Android)",
                    "Tombol \"Kirim ke WhatsApp\" dan \"Salin Template\" setelah membuat project sekarang mengikuti template dari Pengaturan",
                    "Tombol pengingat di semua lokasi (daftar project, status klien) sekarang konsisten menggunakan template custom",
                    "Kartu status klien diwarnai sesuai status — merah (belum memilih), kuning (sedang memilih), hijau (sudah ditinjau)",
                    "Ikon tab dashboard diganti dengan ikon SVG yang lebih bersih",
                    "Galeri review mengikuti gaya grid foto dengan rasio 4:3 dan overlay zoom",
                    "Tab \"Bot Telegram\" baru di Pengaturan dengan panduan setup visual langkah demi langkah",
                ]
            },
            {
                category: "Perbaikan", items: [
                    "Memperbaiki emoji rusak di pesan WhatsApp Desktop dengan beralih ke API WhatsApp langsung",
                    "Memperbaiki dialog popup yang menutup saat klik di luar salah memicu aksi konfirmasi",
                    "Memperbaiki verifikasi password dipindahkan ke sisi server untuk mencegah terlihat di inspect element",
                    "Memperbaiki template WhatsApp foto tambahan yang tidak mengikuti template custom dari Pengaturan",
                ]
            }
        ]
    },
    {
        id: 'v123',
        version: '1.2.3',
        release_date: '2026-02-14T00:00:00.000Z',
        changes_en: [
            {
                category: "Features", items: [
                    "Added \"Copy Template\" button next to WhatsApp send buttons — quickly copy the message template to clipboard",
                    "Drag and drop folders into breadcrumbs to reorganize",
                ]
            },
            {
                category: "Improvements", items: [
                    "\"Select All\" button now selects both projects and folders in manage mode",
                ]
            }
        ],
        changes_id: [
            {
                category: "Fitur", items: [
                    "Menambahkan tombol \"Salin Template\" di samping tombol kirim WhatsApp — salin teks template pesan ke clipboard dengan cepat",
                    "Drag and drop folder ke breadcrumb untuk mengorganisir",
                ]
            },
            {
                category: "Peningkatan", items: [
                    "Tombol \"Pilih Semua\" sekarang memilih project dan folder sekaligus di mode kelola",
                ]
            }
        ]
    },
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
