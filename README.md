# Leptospirosis Dashboard — Chart Fix
Perbaikan & fitur:
- Tren kasus mendukung **per Bulan** atau **per Tahun** (granularitas bisa dipilih).
- Bisa ganti **jenis grafik** (Line/Batang) untuk **Tren** dan **Kab/Kota**.
- Filter waktu: rentang **bulan** (YYYY-MM) atau **tahun** (start–end).
- Filter **Provinsi** dan **Kab/Kota** ikut tersaring ke grafik.
- Range bulan/tahun **otomatis terbentuk** dari data jika input kosong.
- Jika Provinsi tidak dipilih, grafik Kab/Kota menampilkan **Top 10** dari keseluruhan.

Cara pakai:
1. Upload semua file ke repo GitHub (branch `main`). Pages via Actions sudah disiapkan.
2. (Opsional) Hubungkan ke Google Sheets: isi `SHEETS_URL` di `script.js`, deploy `apps_script.gs`.

Catatan:
- Data tanggal grafik mengambil `onset`, jika kosong jatuh ke `tglPaparan`, lalu `savedAt`.
- Tombol **Apply** dan perubahan pada kontrol akan **langsung** menyegarkan grafik.
