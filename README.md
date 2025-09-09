# Dashboard Leptospirosis — Satu Kolom (Monokrom)

Dashboard web statis untuk pencatatan kasus Leptospirosis (tema monokrom, 1 kolom memanjang).

## Fitur Utama
- **Data Pasien** lengkap (identitas, alamat, provinsi → kab/kota).
- **Riwayat Gejala** (2 kolom). Tanggal muncul otomatis diminta saat gejala dicentang. **Onset** dihitung dari tanggal gejala paling awal.
- **Riwayat Kontak** (tanggal paparan & checklist faktor risiko 2 kolom).
- **Lab** dengan nilai normal pada label + opsi lanjutan (Amilase, CPK, PCR, Proteinuria/Hematuria). **Abnormal** highlight otomatis.
- **Definisi Kasus Otomatis** (Suspek/Probable/Confirm) — badge warna di pojok kanan atas & label berwarna pada tabel.
- **Simpan Lokal** menggunakan `localStorage`.
- **Cek & Hapus Duplikat** (kunci: nama+umur+alamat+onset).
- **Analisis & Grafik** (Chart.js) — tren bulanan + sebaran kab/kota, dengan filter provinsi/kab dan rentang bulan.
- **Ekspor Excel** (.xlsx) memakai SheetJS.
- **Token Gate**: hanya dapat diakses setelah memasukkan token `ZOOLEPTO123` (disimpan sebagai flag di `localStorage`).

## Cara Pakai (Lokal)
1. Buka `index.html` di browser modern (Chrome/Edge/Opera/Firefox).
2. Masukkan token **ZOOLEPTO123** saat diminta.
3. Isi form, klik **Simpan Kasus**. Data tersimpan di `localStorage` per-browser.
4. Gunakan **Cek/Hapus Duplikat** dan **Ekspor Excel** sesuai kebutuhan.

## Deploy ke GitHub Pages
1. Buat repository baru (public).
2. Upload file berikut: `index.html`, `README.md`, `LICENSE` (opsional).
3. Aktifkan **Settings → Pages → Deploy from Branch** (pilih branch `main` dan folder `/ (root)`).
4. Akses situs dari URL GitHub Pages yang diberikan.

## Catatan
- `PROV_KAB` dalam file masih contoh ringkas. Ganti dengan daftar lengkap bila diperlukan.
- Token gate bersifat **client-side** (untuk menyaring akses kasual). Untuk keamanan kuat, gunakan autentikasi server-side.

## Lisensi
MIT — lihat file `LICENSE`.


## Ketahanan Jika CDN Down
- **Chart.js**: otomatis fallback ke `vendor/chartjs-shim.min.js` (menampilkan placeholder pada kanvas).
- **SheetJS (XLSX)**: bila CDN gagal, tombol ekspor otomatis **fallback ke CSV** (`leptospirosis_cases.csv`), tanpa dependensi tambahan.


### Fallback XLSX Offline
- Jika CDN SheetJS gagal dimuat, aplikasi otomatis memuat **`vendor/xlsxlite.min.js`** (penulis XLSX minimal satu-sheet, tanpa kompresi).
- Urutan prioritas ekspor: **XLSX (CDN)** → **XLSXLite (lokal)** → **CSV**.
