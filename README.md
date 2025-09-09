# Leptospirosis Dashboard — FIX
Perbaikan fatal yang membuat grafik & peta tidak muncul:
- Typo `True`/`False` → `true`/`false` (JS), yang bikin `updateCharts()` crash.
- Map di-init **setelah token unlock** + `invalidateSize()`.
- GeoJSON diambil dari RAW GitHub (CORS ok). Jika gagal, pesan ditampilkan di bawah peta.

Google Sheets:
- Isi `SHEETS_URL` di `script.js` dengan URL Web App **/exec**.
- Frontend pakai `mode:'no-cors'` + `text/plain` agar tidak gagal CORS.
