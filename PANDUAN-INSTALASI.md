# Panduan Instalasi EduGrade

EduGrade terdiri dari dua bagian:

| Bagian | Isi | Tempat |
|---|---|---|
| **Backend** | `Kode.gs` dan `appsscript.json` | Google Apps Script (editor script.google.com) |
| **Frontend** | Isi folder ZIP ini (`index.html`, `admin.html`, `css/`, `js/`) | GitHub Pages |

Kerjakan berurutan: Backend dulu, karena frontend butuh alamat (URL) backend.

---

## TAHAP A — Backend (Google Apps Script)

1. Buka https://script.google.com → **Proyek baru**. Beri nama `EduGrade Backend`.
2. Di panel kiri, klik file `Kode.gs` (bawaan bernama `Code.gs`, boleh diganti nama). Hapus isinya, lalu **tempel seluruh isi `Kode.gs`**.
3. Tampilkan file manifes: ikon ⚙️ **Setelan proyek** → centang **Tampilkan file manifes "appsscript.json" di editor**. Buka `appsscript.json`, ganti isinya dengan isi file `appsscript.json` yang diberikan.
4. Klik **Simpan** (ikon disket).
5. Jalankan setup **SEKALI SAJA**:
   - Di menu pilihan fungsi (sebelah tombol ▶ Jalankan), pilih **`setupAppEnvironment`** → klik **▶ Jalankan**.
   - Klik **Tinjau izin** → pilih akun Google Anda → **Lanjutan** → **Buka EduGrade Backend (tidak aman)** → **Izinkan**. (Peringatan ini normal untuk skrip buatan sendiri.)
   - Buka **Log eksekusi** di bawah. Pastikan muncul ✅ dan baris **🔑 SANDI ADMIN AWAL: xxxxx**.
   - **Catat sandi admin itu sekarang.** Sandi hanya tampil sekali.
   - Cek Google Drive: ada folder **📁 EduGrade** berisi spreadsheet **🗃️ Database — EduGrade**.
6. Deploy sebagai Web App:
   - Kanan atas: **Terapkan → Deployment baru** → ikon ⚙️ pilih **Aplikasi web**.
   - **Jalankan sebagai:** Saya. **Yang memiliki akses:** Siapa saja.
   - Klik **Terapkan** → salin **URL aplikasi web** (berakhiran `/exec`).

> Setiap kali `Kode.gs` diubah: **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan**. URL tetap sama.

**Opsional (musim rapor):** jalankan sekali fungsi `installWarmupTrigger` agar server tetap "hangat" dan klaim kuota lebih cepat.

**Lupa sandi admin?** Jalankan fungsi `resetAdminPassword`, sandi baru tampil di log.

---

## TAHAP B — Isi konfigurasi frontend

Buka file **`js/config.js`** dengan Notepad, lalu ubah dua baris:

```js
GAS_URL: 'https://script.google.com/macros/s/ID_ANDA/exec',   // tempel URL dari Tahap A langkah 6
WA_ADMIN: '62812xxxxxxx',                                    // nomor WhatsApp admin, format 62...
```

Simpan.

---

## TAHAP C — Upload frontend ke GitHub Pages

> ⚠️ Jangan memakai tombol "Upload files" di situs GitHub. Struktur folder `css/` dan `js/` bisa rusak. Pakai terminal (Git) seperti di bawah.

**Folder kerja = folder hasil ekstrak ZIP `edugrade-frontend`.** Di folder ini **`index.html` harus terlihat langsung** (bukan di dalam subfolder). Di folder inilah `git init` dijalankan.

1. Install Git: https://git-scm.com/download/win (Windows, pilih semua bawaan).
2. Buat akun dan repository baru di https://github.com → **+ → New repository** → nama `edugrade`, pilih **Public**, **jangan** centang README.
3. Buka folder `edugrade-frontend` di File Explorer → klik address bar → ketik `powershell` → Enter.
4. Cek isi folder:
   ```powershell
   dir
   ```
   Harus tampil `index.html`, `admin.html`, folder `css` dan `js`. Kalau belum, jangan lanjut.
5. Jalankan satu per satu:
   ```powershell
   git config --global user.name "Nama Anda"
   git config --global user.email "email-github@anda.com"
   git init
   git add .
   git commit -m "Upload pertama EduGrade"
   git branch -M main
   git remote add origin https://github.com/USERNAME/edugrade.git
   git push -u origin main
   ```
   Saat diminta **Password**, tempel **Personal Access Token** (bukan sandi GitHub). Buat di https://github.com/settings/tokens → *Generate new token (classic)* → centang **repo**. Layar tidak menampilkan apa pun saat Anda menempel. Ini normal, langsung tekan Enter.
6. Di repository GitHub: **Settings → Pages** → Source **Deploy from a branch**, Branch **main** / **(root)** → **Save**. Centang **Enforce HTTPS**.
7. Tunggu 1–2 menit. Aplikasi guru tersedia di `https://USERNAME.github.io/edugrade/`, panel admin di `https://USERNAME.github.io/edugrade/admin.html`.

**Update berikutnya** (dari folder yang sama):
```powershell
git add .
git commit -m "Perbarui"
git push
```
Bila tampilan masih versi lama, tekan **Ctrl+Shift+R**.

---

## TAHAP D — Pengaturan awal di panel admin

1. Buka `admin.html` → tab **Admin** → masukkan sandi admin awal.
2. **Pengaturan**: isi nomor WhatsApp admin, nama pengirim email, dan **Alamat aplikasi guru** (URL GitHub Pages Anda). Klik *Kirim email uji coba*. **Ubah sandi admin**.
3. **Paket & Harga**: atur harga, kuota, dan masa berlaku (angka awal hanya contoh).
4. **Affiliate** (opsional): tambah mitra. Sandi mitra tampil sekali, kirim lewat WhatsApp.
5. **Kode → Buat Kode Baru**: buat 1 kode uji untuk diri sendiri.

---

## TAHAP E — Uji coba sebelum dijual

1. Buka aplikasi guru → **Ubah Nilai** → unggah file nilai contoh → ikuti 4 langkah → **Unduh Excel** → masukkan kode uji.
2. Buka file hasil di Excel. Pastikan nilai berubah dan lembar lain utuh.
3. **Isi e-Rapor** → unggah template asli dari dashboard e-Rapor **kelas uji** → ikuti 5 langkah → unduh.
4. **Impor file itu ke e-Rapor kelas uji.** Ini uji paling penting sebelum dipakai guru lain.
5. Di admin, cek **Kode → Detail**: kuota berkurang dan riwayat unduhan tercatat.
6. Unduh ulang file yang sama. Kuota tidak boleh berkurang lagi.

---

## Memperbarui ke versi baru (pesanan, rekening/QRIS, affiliate)

1. **Backend:** buka proyek Apps Script → ganti seluruh isi `Kode.gs` dengan versi baru → Simpan.
2. Sheet baru (`PESANAN`, `AFFILIATE_DAFTAR`) dan pengaturan baru dibuat otomatis saat pertama dipakai. **Jangan** menjalankan `setupAppEnvironment` lagi.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.** URL `/exec` tetap sama. Bila diminta izin ulang (untuk menyimpan gambar QRIS di Drive), klik Izinkan.
4. **Frontend:** timpa file di folder proyek dengan isi ZIP baru, **kecuali `js/config.js`** (agar `GAS_URL` Anda tidak tertimpa), lalu `git add .` → `git commit -m "Versi pembayaran"` → `git push`. Vercel otomatis memperbarui situs.
5. Masuk admin → **Pengaturan → Pembayaran**: isi rekening, unggah gambar QRIS, lalu **Simpan semua perubahan**.

## Masalah umum

| Gejala | Penyebab & solusi |
|---|---|
| "Alamat server belum diatur" | `GAS_URL` di `js/config.js` belum diisi. Isi lalu push ulang. |
| "Tidak bisa terhubung ke server" | Deployment belum diset **Siapa saja**, atau belum dibuat versi baru setelah mengubah `Kode.gs`. |
| Halaman 404 di GitHub Pages | `index.html` tidak berada di root repo (salah folder saat `git init`). |
| Email kode tidak terkirim | Cek kuota email harian Gmail (±100/hari untuk akun biasa) di tombol *Kirim email uji coba*. |
| "Setup belum dijalankan" | Jalankan `setupAppEnvironment` sekali. |
| Gambar QRIS tidak tampil di halaman bayar | Akun Google Workspace sekolah/kantor kadang melarang berbagi "siapa saja yang memiliki link". Pakai akun Gmail biasa untuk Apps Script, atau unggah ulang QRIS. |
| Tombol Beli Sekarang tidak muncul | Rekening atau QRIS belum diisi di Pengaturan, sehingga yang tampil tombol pesan lewat WhatsApp. |
| Nilai terbaca kosong | File guru berisi rumus yang belum dihitung. Buka di Excel, tekan Simpan, unggah lagi. |

## Catatan teknis singkat

- Data siswa tidak pernah dikirim ke server. Server hanya menyimpan kode, kuota, sidik file (hash), nama file hasil, dan jumlah siswa.
- Rahasia (hash sandi admin, kunci sesi, ID spreadsheet) tersimpan di **Script Properties**, bukan di kode atau sheet.
- Klaim kuota memakai kunci (LockService) dan `request_id`, sehingga dua klik atau koneksi putus tidak memotong kuota dua kali.
- File hasil Ubah Nilai meminta Excel menghitung ulang rumus saat dibuka. Di LibreOffice, tekan **Ctrl+Shift+F9** bila angka jumlah/rata-rata belum berubah.
- Pustaka pembaca Excel (SheetJS 0.18.5) dan JSZip disertakan di `js/vendor/`, jadi tidak bergantung CDN.
