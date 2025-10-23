/* ============================================
 * Dashboard Leptospirosis – Network & Sync Fix
 * Fitur: Retry (3x, 2–3s), Timeout (30s read, 60s write),
 * AbortController, Online/Offline detection & auto-recovery,
 * Better error messages, Test Connection (opsional).
 * ============================================ */

/* ====== KONFIGURASI ====== */
const ACCESS_TOKEN = 'ZOOLEPTO123';
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyR8WE2fj68tqerlOGySgVOagIrErB886veKazNpetlXWTO-Bi85G3_IccJDNnph4km/exec';

const SPREADSHEET_ID = '1rcySn3UNzsEHCd7t7ld4f-pSBUTrbNDBDgvxjbLcRm4';
const SHEET_NAME = 'Kasus';
const SHEETS_READ_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json`;

/* ====== UTILITAS UI (minimal) ====== */
function updateSyncStatus(msg, isError = false){
  console[isError ? 'warn' : 'log'](`[SYNC] ${msg}`);
  const el = document.getElementById('syncStatus');
  if (el){
    el.textContent = msg;
    el.dataset.state = isError ? 'error' : 'ok';
  }
}

/* ====== NETWORK HELPERS ====== */
const NET = {
  isOnline: () => navigator.onLine,
  waitForOnline: () => new Promise(res => {
    if (navigator.onLine) return res();
    const once = () => { window.removeEventListener('online', once); res(); };
    window.addEventListener('online', once, { once: true });
  }),
  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Retry policy: 3x dengan jitter 2–3 dtk; abort jika timeout.
 * @param {string} url
 * @param {object} options - fetch options
 * @param {object} cfg - { retries, timeoutMs, onRetry }
 */
async function fetchWithRetry(url, options = {}, cfg = {}) {
  const retries = cfg.retries ?? 3;
  const timeoutMs = cfg.timeoutMs ?? 30000;
  let lastErr;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!NET.isOnline()) {
        await NET.waitForOnline();
      }
      const res = await fetchWithTimeout(url, options, timeoutMs);
      if (!res.ok) {
        const txt = await safeReadText(res);
        throw new Error(`HTTP ${res.status} – ${res.statusText}${txt ? ` | ${txt.slice(0, 180)}` : ''}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt >= retries) break;
      const jitter = 2000 + Math.floor(Math.random() * 1000);
      cfg.onRetry?.(attempt, err, jitter);
      await NET.sleep(jitter);
    }
  }
  throw lastErr;
}

async function safeReadText(res) {
  try { return await res.text(); } catch { return ''; }
}

function humanizeFetchError(err, context = 'permintaan') {
  if (err?.name === 'AbortError') return `Batas waktu ${context} habis (timeout). Periksa koneksi & coba lagi.`;
  const msg = String(err?.message || err);
  if (msg.includes('Failed to fetch')) return `Gagal terhubung ke server (Failed to fetch). Kemungkinan: CORS, koneksi internet, atau URL web app tidak "Anyone".`;
  if (msg.includes('HTTP 403')) return `Akses ditolak (403). Pastikan Web App GAS di-deploy dengan akses "Anyone with the link" dan token benar.`;
  if (msg.includes('HTTP 404')) return `Endpoint tidak ditemukan (404). Periksa URL Apps Script.`;
  return `Gagal ${context}: ${msg}`;
}

/* ====== GViz Parser (READ) ====== */
function parseGVizJSON(text){
  // Buang prefix/suffix GViz
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Format GViz tidak valid.');
  const json = JSON.parse(text.slice(start, end + 1));
  const table = json.table;
  const cols = table.cols.map(c => c.label || c.id || 'col');
  const out = [];
  for (const r of (table.rows || [])){
    const obj = {};
    (r.c || []).forEach((cell, i) => {
      obj[cols[i] || `col${i+1}`] = cell ? (cell.v ?? cell.f ?? '') : '';
    });
    out.push(obj);
  }
  return out;
}

/* ====== Data helpers (placeholder minimal) ====== */
// Jika Anda sudah punya struktur data sendiri, silakan ganti fungsi ini sesuai kebutuhan.
function flatToCase(x){ return x; }
function flattenCase(x){ return x; }
function loadCases(){
  try{
    const raw = localStorage.getItem('cases') || '[]';
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function scheduleAutoPull(){ /* no-op placeholder bila sudah ada scheduler di app Anda */ }

/* ====== READ dari Google Sheets (timeout 30s + retry) ====== */
async function readSheetCases(){
  if(!SPREADSHEET_ID) throw new Error('SPREADSHEET_ID belum diisi');

  const res = await fetchWithRetry(
    SHEETS_READ_URL,
    { mode:'cors', cache:'no-store' },
    { 
      retries: 3, 
      timeoutMs: 30000,
      onRetry: (i, e, wait) => updateSyncStatus(`Tarik data gagal (percobaan ${i}). Ulangi ${Math.round(wait/1000)} dtk...`, true)
    }
  );

  const text = await safeReadText(res);
  if(!text) throw new Error('Respon kosong dari GViz');
  const flat = parseGVizJSON(text);
  return flat.map(flatToCase);
}

/* ====== WRITE ke Google Sheets (timeout 60s + retry) ====== */
async function sendAllToSheets(replace=false){
  if(!SHEETS_URL){
    alert('SHEETS_URL belum diisi di script.js'); 
    return; 
  }
  const arr = loadCases();
  if(arr.length===0){ alert('Tidak ada data untuk dikirim.'); return; }

  const rows = arr.map(flattenCase);
  const payload = { token: ACCESS_TOKEN, action: replace ? 'replaceAll' : 'appendBatch', rows };

  try{
    updateSyncStatus('Mengirim data ke Google Sheets...');
    const res = await fetchWithRetry(
      SHEETS_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'cors',
        cache: 'no-store'
      },
      { 
        retries: 3, 
        timeoutMs: 60000,
        onRetry: (i, e, wait) => updateSyncStatus(`Kirim gagal (percobaan ${i}). Ulangi ${Math.round(wait/1000)} dtk...`, true)
      }
    );

    const text = await safeReadText(res);
    let result;
    try { result = JSON.parse(text); } 
    catch { throw new Error('Respon bukan JSON: ' + text.slice(0,200)); }

    if(result?.ok){
      const cnt = Number.isFinite(result.count) ? result.count : rows.length;
      updateSyncStatus(`Berhasil kirim ke Sheets (${cnt} baris)`);
      alert('Data berhasil dikirim ke Google Sheets');
    } else {
      throw new Error(result?.error || result?.message || 'Gagal mengirim data');
    }
  }catch(err){
    const msg = humanizeFetchError(err, 'mengirim ke Sheets');
    updateSyncStatus(msg, true);
    alert(msg);
    if(!NET.isOnline()){
      updateSyncStatus('Offline terdeteksi. Akan mencoba ulang saat koneksi kembali...', true);
      NET.waitForOnline().then(()=>sendAllToSheets(replace)).catch(()=>{});
    }
  }
}

/* ====== Online/Offline Hooks ====== */
window.addEventListener('offline', () => {
  updateSyncStatus('Koneksi terputus. Anda offline.', true);
});
window.addEventListener('online', () => {
  updateSyncStatus('Koneksi tersambung, memulai sinkronisasi...');
  setTimeout(scheduleAutoPull, 1000);
  // (opsional) aktifkan auto-push bila perlu:
  // sendAllToSheets(false);
});

/* ====== Test Connection Button (opsional) ====== */
function bindTestConnection(){
  const btn = document.getElementById('testConn');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    try{
      const url = new URL(SHEETS_URL);
      url.searchParams.set('action', 'ping');
      url.searchParams.set('ts', Date.now());
      updateSyncStatus('Menguji koneksi ke Apps Script...');
      const res = await fetchWithRetry(url.toString(), { method: 'GET', mode: 'cors', cache: 'no-store' }, { retries: 2, timeoutMs: 10000 });
      const txt = await safeReadText(res);
      alert(`Ping OK: ${txt?.slice(0,120) || 'OK'}`);
      updateSyncStatus('Koneksi OK');
    }catch(err){
      const msg = humanizeFetchError(err, 'menghubungi Apps Script');
      alert(msg);
      updateSyncStatus(msg, true);
    }
  });
}

/* ====== Inisialisasi minimal ====== */
function initApp(){
  bindTestConnection();
  updateSyncStatus('Aplikasi siap.'); 
}
document.addEventListener('DOMContentLoaded', initApp);
