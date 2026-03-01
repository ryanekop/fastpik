# Changelog

## v1.4.1 (2026-02-28)

### ✨ Tampilan Foto (Photo Viewer)

#### Navigasi
- **Geser halus antar foto** — foto sebelah muncul dengan efek fade saat digeser
- **Geser cepat** — geser berturut-turut tetap mulus tanpa gangguan
- **Geser di mobile** — foto mengikuti jari seperti galeri asli
- **Geser di desktop** — klik dan seret untuk pindah foto

#### Zoom
- **Klik untuk zoom di desktop** — zoom bertahap mengikuti posisi mouse
- **Double-tap zoom di mobile** — ketuk dua kali untuk zoom ke titik yang diketuk
- **Pinch-to-zoom lebih halus** — tidak ada getaran saat zoom pakai dua jari
- **Zoom-out lebih natural** — animasi zoom keluar lebih mulus

#### Indikator Zoom
- **Persentase zoom animasi** — indikator zoom bergerak halus saat zoom masuk/keluar

#### Thumbnail
- **Scroll thumbnail pakai mouse** — scroll vertikal otomatis jadi scroll horizontal
- **Thumbnail selalu di tengah** — foto pertama/terakhir tidak menempel di pinggir

#### Mobile
- **Foto tidak terpotong** — ukuran foto menyesuaikan tampilan browser mobile
- **Loading pintar** — foto yang sudah pernah dilihat langsung tampil tanpa loading
- **Fade-in halus** — foto baru tampil dengan efek fade setelah dimuat

#### Perbaikan Bug
- Memperbaiki foto kadang tidak muncul saat loading
- Memperbaiki double-tap zoom tidak zoom ke titik yang benar
- Memperbaiki zoom yang kadang melompat ke posisi salah di desktop

### 🔧 Format Nomor WhatsApp

- **Dukungan multi-negara** — format nomor telepon otomatis untuk 20+ negara
- **Perbaikan kode negara salah** — nomor 08xx tidak lagi salah dikirim sebagai +82 (Korea), sekarang benar +62 (Indonesia)
- **Format otomatis** — nomor `0812...`, `812...`, atau `62812...` semua dikenali dengan benar
- **Sesuai pengaturan project** — menggunakan kode negara yang diset di pengaturan masing-masing project
