// =====================
// KONFIGURASI
// =====================
const ACCESS_TOKEN = 'ZOOLEPTO123';
const DEFAULT_GH = 'https://raw.githubusercontent.com/agustddiction/Dashboard-Leptospirosis/main/provinsi.json';
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxFHgRel9-LTQTc0YIjy5G22BWk1RiqUjjDqCd8XE1Q4tF8h4t5r8X9WL-MwVZ2IyyYHg/exec';
const SPREADSHEET_ID = '1rcySn3UNzsEHCd7t7ld4f-pSBUTrbNDBDgvxjbLcRm4';
const SHEET_NAME = 'Kasus';
const SHEETS_READ_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json`;
const AUTO_SYNC_ENABLED = true;
const AUTO_SYNC_INTERVAL_MS = 2*60*1000;

let PROV_KAB={};
fetch('./data/kabkota.json').then(r=>r.json()).then(j=>{ PROV_KAB=j; initProvKab(); }).catch(()=>{ PROV_KAB={"Aceh":["Kabupaten Aceh Besar"]}; initProvKab(); });

const GEJALA=[
  {id:"demam",label:"Demam akut"},
  {id:"nyeriKepala",label:"Nyeri kepala"},
  {id:"mialgia",label:"Mialgia"},
  {id:"malaise",label:"Malaise / Lemah"},
  {id:"conj",label:"Conjunctival suffusion"},
  {id:"nyeriBetis",label:"Nyeri betis"},
  {id:"jaundice",label:"Jaundice / Ikterik"},
  {id:"batuk",label:"Batuk dgn/tnp darah"},
  {id:"perdarahan",label:"Manifestasi perdarahan"},
  {id:"anuria",label:"Anuria / Oliguria"},
  {id:"aritmia",label:"Aritmia jantung"},
  {id:"ruam",label:"Ruam kulit"},
  {id:"sesak",label:"Sesak napas"},
];

const PAPARAN=[
  "Kontak dengan banjir",
  "Kontak sungai/danau (mencuci, mandi, pekerjaan)",
  "Sawah/perkebunan tanpa alas kaki",
  "Kontak erat dengan hewan terinfeksi",
  "Kontak dengan hewan mati/cairan infeksius",
  "Menangani spesimen leptospirosis",
  "Pekerjaan berisiko (drh hewan, RPH, pet shop, petani, pembersih selokan, dll.)",
  "Hobi/olahraga/wisata (berenang, memancing, arung jeram, dll.)",
  "Sering melihat tikus/tanda keberadaan tikus",
  "Memiliki hewan peliharaan/ternak di rumah",
  "Menuju kerja/sekolah melewati genangan air/banjir",
  "Di tempat kerja/sekolah terdapat tikus atau tanda keberadaan tikus",
  "Membersihkan got/selokan/kolam tanpa APD"
];

const prov=document.getElementById('prov');
const kab=document.getElementById('kab');
const fProv=document.getElementById('fProv');
const fKab=document.getElementById('fKab');
const fStart=document.getElementById('fStart');
const fEnd=document.getElementById('fEnd');
const fTimeMode=document.getElementById('fTimeMode');
const fYearStart=document.getElementById('fYearStart');
const fYearEnd=document.getElementById('fYearEnd');

let syncStatus = { isOnline: navigator.onLine, lastSync: null, lastError: null, isSyncing: false };

function updateSyncStatus(message, isError = false) {
  const statusEl = document.getElementById('pullStatus');
  if (statusEl) {
    const now = new Date().toLocaleString('id-ID');
    statusEl.textContent = `${message} • ${now}`;
    statusEl.style.color = isError ? '#dc2626' : '#16a34a';
  }
  if (isError) { syncStatus.lastError = message; console.error('Sync Error:', message); }
  else { syncStatus.lastSync = new Date(); syncStatus.lastError = null; }
}

window.addEventListener('online', () => {
  syncStatus.isOnline = true;
  updateSyncStatus('Koneksi tersambung, memulai sinkronisasi...');
  setTimeout(scheduleAutoPull, 1000);
});

window.addEventListener('offline', () => {
  syncStatus.isOnline = false;
  updateSyncStatus('Offline - sinkronisasi ditunda', true);
});

function _bindHeaderShadow(){
  const h=document.querySelector('header');
  if(!h) return;
  const onscroll=()=>{ if(window.scrollY>4) h.classList.add('scrolled'); else h.classList.remove('scrolled'); };
  window.addEventListener('scroll', onscroll, {passive:true});
  onscroll();
}

function _syncTimeModeUI(){
  const mode=(document.getElementById('fTimeMode')?.value)||'month';
  const mWrap=document.getElementById('monthRangeWrap');
  const yWrap=document.getElementById('yearRangeWrap');
  if(mode==='month'){
    mWrap?.classList.remove('inactive');
    yWrap?.classList.remove('active');
    yWrap?.classList.add('inactive');
  }else{
    yWrap?.classList.add('active');
    mWrap?.classList.add('inactive');
  }
}

function initProvKab(){
  const provs=Object.keys(PROV_KAB).sort();
  const addOpts=(sel,items,withAll=false)=>{
    sel.innerHTML="";
    if(withAll) sel.append(new Option("Semua",""));
    sel.append(new Option("Pilih...",""));
    items.forEach(x=>sel.append(new Option(x,x)));
  };
  addOpts(prov,provs,false);
  addOpts(fProv,provs,true);
  const updateKab=(selKab,provName,withAll=false)=>{
    selKab.innerHTML="";
    if(withAll) selKab.append(new Option("Semua",""));
    if(!provName||!PROV_KAB[provName]){ selKab.append(new Option("Pilih provinsi dulu","")); return; }
    PROV_KAB[provName].forEach(x=>selKab.append(new Option(x,x)));
  };
  prov.addEventListener('change', ()=>updateKab(kab,prov.value,false));
  fProv.addEventListener('change', ()=>updateKab(fKab,fProv.value,true));
  updateKab(kab,prov.value,false);
  updateKab(fKab,fProv.value,true);
}

function genUUID(){
  try{ if (crypto && crypto.randomUUID) return crypto.randomUUID(); }
  catch(_) {}
  return 'xxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
    const r = Math.random()*16|0;
    const v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function normalizeString(str) {
  if (!str) return '';
  return str.toString().trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
}

function generateDuplicateKey(data) {
  const nama = normalizeString(data.nama || '');
  const umur = (data.umur || '').toString().trim();
  const alamat = normalizeString(data.alamat || '');
  const onset = data.onset || '';
  return [nama, umur, alamat, onset].join('|');
}

let editingIndex = -1;
let editingUUID = null;

function loadCases() {
  try {
    const data = localStorage.getItem('lepto_cases');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading cases:', e);
    return [];
  }
}

function saveCases(arr) {
  try {
    localStorage.setItem('lepto_cases', JSON.stringify(arr));
    return true;
  } catch (e) {
    console.error('Error saving cases:', e);
    alert('Gagal menyimpan data. Mungkin storage penuh.');
    return false;
  }
}

function calculateCFR(cases) {
  const meninggal = cases.filter(d => d.statusAkhir === 'Meninggal').length;
  const total = cases.length;
  return total > 0 ? ((meninggal / total) * 100).toFixed(2) : '0.00';
}

function renderCounts() {
  const arr = loadCases();
  const el = document.getElementById('counts');
  const cfrEl = document.getElementById('cfrDisplay');
  if (el) el.textContent = `Total: ${arr.length} kasus`;
  if (cfrEl) {
    const cfr = calculateCFR(arr);
    cfrEl.textContent = `CFR: ${cfr}%`;
    cfrEl.className = 'tag';
    if (parseFloat(cfr) > 10) cfrEl.classList.add('bad');
    else if (parseFloat(cfr) > 5) cfrEl.classList.add('warn');
    else cfrEl.classList.add('ok');
  }
}

function renderTable() {
  const arr = loadCases();
  const tbody = document.querySelector('#casesTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  arr.forEach((d, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.nama || '-'}</td>
      <td>${d.umur || '-'}</td>
      <td>${d.jk || '-'}</td>
      <td>${d.onset || '-'}</td>
      <td>${d.statusAkhir || '-'}</td>
      <td><span class="tag ${d.definisi === 'Konfirmasi' ? 'ok' : (d.definisi === 'Probable' ? 'warn' : 'bad')}">${d.definisi || '-'}</span></td>
      <td>
        <button class="btn small" onclick="editCase(${i})">Edit</button>
        <button class="btn small danger" onclick="deleteCase(${i})">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function getFormData() {
  const gejala = {};
  const gejalaTgl = {};
  GEJALA.forEach(g => {
    const cb = document.getElementById(g.id);
    const dt = document.getElementById(g.id + 'Tgl');
    gejala[g.label] = cb ? cb.checked : false;
    gejalaTgl[g.label] = (dt && cb && cb.checked) ? dt.value : '';
  });

  const paparan = PAPARAN.map(label => {
    const cb = document.getElementById('pap_' + label.replace(/[^a-zA-Z0-9]/g, '_'));
    return { label, checked: cb ? cb.checked : false };
  });

  const getRdVal = name => {
    const sel = document.querySelector(`input[name="${name}"]:checked`);
    return sel ? sel.value : 'nd';
  };

  const onset = calculateOnset(gejalaTgl);

  const data = {
    uuid: editingUUID || genUUID(),
    nama: document.getElementById('nama').value.trim(),
    jk: document.getElementById('jk').value,
    umur: document.getElementById('umur').value,
    kerja: document.getElementById('kerja').value.trim(),
    prov: document.getElementById('prov').value,
    kab: document.getElementById('kab').value,
    alamat: document.getElementById('alamat').value.trim(),
    onset,
    gejala,
    gejalaTgl,
    paparan,
    lab: {
      leukosit: document.getElementById('leukosit').value,
      trombosit: document.getElementById('trombosit').value,
      bilirubin: document.getElementById('bilirubin').value,
      sgot: document.getElementById('sgot').value,
      sgpt: document.getElementById('sgpt').value,
      kreatinin: document.getElementById('kreatinin').value,
      rdt: getRdVal('rdt'),
      mat: getRdVal('mat'),
      serovar: document.getElementById('serovar').value.trim(),
      amilase: document.getElementById('amilase').value,
      cpk: document.getElementById('cpk').value,
      pcr: getRdVal('pcr'),
      proteinuria: document.getElementById('proteinuria').checked,
      hematuria: document.getElementById('hematuria').checked,
    },
    definisi: calculateDefinisi(gejala, paparan, { leukosit: document.getElementById('leukosit').value, trombosit: document.getElementById('trombosit').value, bilirubin: document.getElementById('bilirubin').value, rdt: getRdVal('rdt'), mat: getRdVal('mat') }),
    statusAkhir: document.getElementById('statusAkhir').value,
    tglStatus: document.getElementById('tglStatus').value,
    obat: document.getElementById('obat').value.trim(),
    savedAt: new Date().toISOString()
  };
  return data;
}

function calculateOnset(gejalaTgl) {
  const dates = Object.values(gejalaTgl).filter(d => d);
  if (dates.length === 0) {
    const manual = document.getElementById('onsetManual').value;
    return manual || '';
  }
  return dates.sort()[0];
}

function calculateDefinisi(gejala, paparan, lab) {
  const hasSymptoms = Object.values(gejala).some(v => v);
  const hasExposure = paparan.some(p => p.checked);
  const rdtPos = lab.rdt === 'pos';
  const matPos = lab.mat === 'pos';
  if (matPos) return 'Konfirmasi';
  if (rdtPos && hasSymptoms && hasExposure) return 'Probable';
  if (hasSymptoms && hasExposure) return 'Suspek';
  return 'Tidak terdefinisi';
}

function updateDefinisiBadge() {
  const gejala = {};
  GEJALA.forEach(g => {
    const cb = document.getElementById(g.id);
    gejala[g.label] = cb ? cb.checked : false;
  });

  const paparan = PAPARAN.map(label => {
    const cb = document.getElementById('pap_' + label.replace(/[^a-zA-Z0-9]/g, '_'));
    return { label, checked: cb ? cb.checked : false };
  });

  const getRdVal = name => {
    const sel = document.querySelector(`input[name="${name}"]:checked`);
    return sel ? sel.value : 'nd';
  };

  const def = calculateDefinisi(gejala, paparan, { leukosit: document.getElementById('leukosit').value, trombosit: document.getElementById('trombosit').value, bilirubin: document.getElementById('bilirubin').value, rdt: getRdVal('rdt'), mat: getRdVal('mat') });

  const badge = document.getElementById('defBadge');
  if (badge) {
    badge.textContent = `Definisi Kasus: ${def}`;
    badge.className = 'badge';
    if (def === 'Konfirmasi') badge.classList.add('ok');
    else if (def === 'Probable') badge.classList.add('warn');
    else if (def === 'Suspek') badge.classList.add('neutral');
    else badge.classList.add('bad');
  }
}

function buildGejalaGrid() {
  const grid = document.getElementById('gejalaGrid');
  if (!grid) return;
  grid.innerHTML = '';
  GEJALA.forEach(g => {
    const div = document.createElement('div');
    div.className = 'symptom';
    div.innerHTML = `
      <input type="checkbox" id="${g.id}"/>
      <label for="${g.id}" style="margin:0; flex:1">${g.label}</label>
      <input id="${g.id}Tgl" type="date" style="width:140px; display:none"/>
    `;
    grid.appendChild(div);
    const cb = div.querySelector('input[type="checkbox"]');
    const dt = div.querySelector('input[type="date"]');
    cb.addEventListener('change', () => {
      dt.style.display = cb.checked ? '' : 'none';
      if (!cb.checked) dt.value = '';
      updateOnsetTag();
      updateDefinisiBadge();
      checkManualOnsetVisibility();
    });
    dt.addEventListener('change', () => {
      updateOnsetTag();
      checkManualOnsetVisibility();
    });
  });
  checkManualOnsetVisibility();
}

function checkManualOnsetVisibility() {
  const anyChecked = GEJALA.some(g => {
    const cb = document.getElementById(g.id);
    return cb && cb.checked;
  });
  const manualWrap = document.getElementById('manualOnsetWrap');
  if (manualWrap) {
    manualWrap.classList.toggle('hidden', anyChecked);
  }
}

function buildPaparanGrid() {
  const grid = document.getElementById('paparanGrid');
  if (!grid) return;
  grid.innerHTML = '';
  PAPARAN.forEach(label => {
    const id = 'pap_' + label.replace(/[^a-zA-Z0-9]/g, '_');
    const div = document.createElement('div');
    div.className = 'symptom';
    div.innerHTML = `
      <input type="checkbox" id="${id}"/>
      <label for="${id}" style="margin:0">${label}</label>
    `;
    grid.appendChild(div);
    const cb = div.querySelector('input[type="checkbox"]');
    cb.addEventListener('change', updateDefinisiBadge);
  });
}

function bindRapidRadioUpdates() {
  ['rdt', 'mat', 'pcr'].forEach(name => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(rd => {
      rd.addEventListener('change', updateDefinisiBadge);
    });
  });
}

function updateOnsetTag() {
  const gejalaTgl = {};
  GEJALA.forEach(g => {
    const cb = document.getElementById(g.id);
    const dt = document.getElementById(g.id + 'Tgl');
    gejalaTgl[g.label] = (dt && cb && cb.checked) ? dt.value : '';
  });
  const onset = calculateOnset(gejalaTgl);
  const tag = document.getElementById('onsetTag');
  if (tag) tag.textContent = onset || '–';
}

function resetForm() {
  document.getElementById('nama').value = '';
  document.getElementById('jk').value = '';
  document.getElementById('umur').value = '';
  document.getElementById('kerja').value = '';
  document.getElementById('prov').value = '';
  document.getElementById('kab').value = '';
  document.getElementById('alamat').value = '';
  GEJALA.forEach(g => {
    const cb = document.getElementById(g.id);
    const dt = document.getElementById(g.id + 'Tgl');
    if (cb) cb.checked = false;
    if (dt) { dt.value = ''; dt.style.display = 'none'; }
  });
  document.getElementById('onsetManual').value = '';
  PAPARAN.forEach(label => {
    const cb = document.getElementById('pap_' + label.replace(/[^a-zA-Z0-9]/g, '_'));
    if (cb) cb.checked = false;
  });
  ['leukosit', 'trombosit', 'bilirubin', 'sgot', 'sgpt', 'kreatinin', 'serovar', 'amilase', 'cpk'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['rdt', 'mat', 'pcr'].forEach(name => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(rd => rd.checked = false);
  });
  document.getElementById('proteinuria').checked = false;
  document.getElementById('hematuria').checked = false;
  document.getElementById('statusAkhir').value = '';
  document.getElementById('tglStatus').value = '';
  document.getElementById('obat').value = '';
  editingIndex = -1;
  editingUUID = null;
  document.body.classList.remove('editing');
  updateOnsetTag();
  updateDefinisiBadge();
}

window.editCase = function(index) {
  const arr = loadCases();
  const d = arr[index];
  if (!d) return;
  editingIndex = index;
  editingUUID = d.uuid;
  document.body.classList.add('editing');
  document.getElementById('nama').value = d.nama || '';
  document.getElementById('jk').value = d.jk || '';
  document.getElementById('umur').value = d.umur || '';
  document.getElementById('kerja').value = d.kerja || '';
  document.getElementById('prov').value = d.prov || '';
  setTimeout(() => { document.getElementById('kab').value = d.kab || ''; }, 100);
  document.getElementById('alamat').value = d.alamat || '';
  GEJALA.forEach(g => {
    const cb = document.getElementById(g.id);
    const dt = document.getElementById(g.id + 'Tgl');
    if (cb) cb.checked = d.gejala[g.label] || false;
    if (dt) {
      dt.value = d.gejalaTgl[g.label] || '';
      dt.style.display = (cb && cb.checked) ? '' : 'none';
    }
  });
  (d.paparan || []).forEach(p => {
    const cb = document.getElementById('pap_' + p.label.replace(/[^a-zA-Z0-9]/g, '_'));
    if (cb) cb.checked = p.checked || false;
  });
  const lab = d.lab || {};
  document.getElementById('leukosit').value = lab.leukosit || '';
  document.getElementById('trombosit').value = lab.trombosit || '';
  document.getElementById('bilirubin').value = lab.bilirubin || '';
  document.getElementById('sgot').value = lab.sgot || '';
  document.getElementById('sgpt').value = lab.sgpt || '';
  document.getElementById('kreatinin').value = lab.kreatinin || '';
  document.getElementById('serovar').value = lab.serovar || '';
  document.getElementById('amilase').value = lab.amilase || '';
  document.getElementById('cpk').value = lab.cpk || '';
  const setRd = (name, val) => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(rd => { rd.checked = (rd.value === val); });
  };
  setRd('rdt', lab.rdt || 'nd');
  setRd('mat', lab.mat || 'nd');
  setRd('pcr', lab.pcr || 'nd');
  document.getElementById('proteinuria').checked = lab.proteinuria || false;
  document.getElementById('hematuria').checked = lab.hematuria || false;
  document.getElementById('statusAkhir').value = d.statusAkhir || '';
  document.getElementById('tglStatus').value = d.tglStatus || '';
  document.getElementById('obat').value = d.obat || '';
  updateOnsetTag();
  updateDefinisiBadge();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteCase = function(index) {
  if (!confirm('Hapus kasus ini?')) return;
  const arr = loadCases();
  arr.splice(index, 1);
  if (saveCases(arr)) {
    renderAll();
    if (AUTO_SYNC_ENABLED && syncStatus.isOnline) setTimeout(scheduleAutoPull, 1000);
  }
};

function renderAll(){
  renderTable();
  renderCounts();
  updateCharts();
  recalcCasesFromLocalAndRefresh();
}

function setupActionButtons() {
  document.getElementById('simpan').addEventListener('click', (e) => {
    e.preventDefault();
    const data = getFormData();
    if (!data.nama) { alert('Nama wajib diisi.'); return; }
    if (!data.prov || !data.kab) { alert('Provinsi dan Kabupaten/Kota wajib dipilih.'); return; }
    const arr = loadCases();
    if (editingIndex >= 0) { arr[editingIndex] = data; }
    else { arr.push(data); }
    if (saveCases(arr)) {
      resetForm();
      renderAll();
      alert('Kasus disimpan.');
      if (AUTO_SYNC_ENABLED && syncStatus.isOnline) setTimeout(scheduleAutoPull, 500);
    } else {
      alert('Gagal menyimpan kasus. Silakan coba lagi.');
    }
  });
  document.getElementById('cancelEdit').addEventListener('click', (e)=>{ e.preventDefault(); resetForm(); });
  document.getElementById('reset').addEventListener('click', (e)=>{ e.preventDefault(); resetForm(); });
  document.getElementById('cekDup').addEventListener('click', ()=>{
    const arr=loadCases();
    const seen={};
    const dups=new Set();
    arr.forEach((d,i)=>{
      const k=generateDuplicateKey(d);
      if(seen[k]!==undefined){ dups.add(i); dups.add(seen[k]); }
      else { seen[k]=i; }
    });
    const rows=document.querySelectorAll('#casesTable tbody tr');
    rows.forEach((tr,i)=>tr.style.backgroundColor = dups.has(i) ? '#fefce8' : '');
    const message = dups.size ? `${Math.floor(dups.size / 2)} pasang duplikat ditemukan & ditandai kuning.` : 'Tidak ada duplikat.';
    alert(message);
  });
  document.getElementById('hapusDup').addEventListener('click', ()=>{
    const arr=loadCases();
    const seen={};
    const result=[];
    arr.forEach(d=>{
      const k=generateDuplicateKey(d);
      if(!(k in seen)){ seen[k]=true; result.push(d); }
    });
    const removed=arr.length-result.length;
    if (removed === 0) { alert('Tidak ada duplikat untuk dihapus.'); return; }
    if (confirm(`Menemukan ${removed} duplikat. Hapus?`)) {
      if (saveCases(result)) {
        renderAll();
        alert(`Menghapus ${removed} duplikat.`);
        if (AUTO_SYNC_ENABLED && syncStatus.isOnline) setTimeout(scheduleAutoPull, 1000);
      }
    }
  });
  document.getElementById('exportExcel').addEventListener('click', exportToExcel);
}

let trendChart, kabChart, umurChart, jkChart;
function ensureCharts(){
  const defaultOptions = { responsive: true, maintainAspectRatio: false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } };
  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins:{ legend:{ position:'top' } } };
  if(!trendChart){ trendChart=new Chart('trendChart',{type:'line',data:{labels:[],datasets:[{label:'Kasus',data:[],borderColor:'#111'}]},options:defaultOptions}); }
  if(!kabChart){ kabChart=new Chart('kabChart',{type:'bar',data:{labels:[],datasets:[{label:'Kasus',data:[],backgroundColor:'#6b7280'}]},options:defaultOptions}); }
  if(!umurChart){ umurChart=new Chart('umurChart',{type:'bar',data:{labels:[],datasets:[{label:'Kasus',data:[],backgroundColor:'#0284c7'}]},options:defaultOptions}); }
  if(!jkChart){ jkChart=new Chart('jkChart',{type:'doughnut',data:{labels:['Laki-laki', 'Perempuan', 'Tidak diisi'],datasets:[{label:'Kasus',data:[],backgroundColor:['#0284c7', '#db2777', '#e5e7eb']}]},options:pieOptions}); }
}

function getDateForAgg(d){ return d.onset || d.tglStatus || (d.savedAt ? d.savedAt.slice(0,10) : ''); }
function monthKey(dateStr){ return dateStr ? dateStr.slice(0,7) : ''; }
function yearKey(dateStr){ return dateStr ? dateStr.slice(0,4) : ''; }
function withinRangeMonth(dateStr,start,end){ const m=monthKey(dateStr); if(!m) return false; if(start&&m<start) return false; if(end&&m>end) return false; return true; }
function withinRangeYear(dateStr,ys,ye){ const y=yearKey(dateStr); if(!y) return false; if(ys&&y<ys) return false; if(ye&&y>ye) return false; return true; }

function updateCharts(){
  ensureCharts();
  const arr=loadCases();
  const fp=fProv.value||"";
  const fk=fKab.value||"";
  const mode=fTimeMode.value||'month';
  const ms=fStart.value||"";
  const me=fEnd.value||"";
  const ys=(fYearStart.value||'');
  const ye=(fYearEnd.value||'');
  const filtered=arr.filter(d=>{
    if(fp&&d.prov!==fp) return false;
    if(fk&&d.kab!==fk) return false;
    const ds=getDateForAgg(d);
    return (mode==='month') ? withinRangeMonth(ds,ms,me) : withinRangeYear(ds,ys,ye);
  });
  const agg={};
  filtered.forEach(d=>{ const ds=getDateForAgg(d); const key=(mode==='month')? monthKey(ds) : yearKey(ds); if(!key) return; agg[key]=(agg[key]||0)+1; });
  const keys=Object.keys(agg).sort();
  trendChart.data.labels=keys;
  trendChart.data.datasets[0].data=keys.map(k=>agg[k]||0);
  trendChart.update();
  const perKab={};
  filtered.forEach(d=>{ const kk=d.kab||'(Tidak diisi)'; perKab[kk]=(perKab[kk]||0)+1; });
  const kLabels=Object.keys(perKab).sort((a, b) => perKab[b] - perKab[a]).slice(0, 15);
  kabChart.data.labels=kLabels;
  kabChart.data.datasets[0].data=kLabels.map(k=>perKab[k]||0);
  kabChart.update();
  const ageGroups = { '0-4':0, '5-14':0, '15-24':0, '25-34':0, '35-44':0, '45-54':0, '55-64':0, '65+':0, 'N/A':0 };
  filtered.forEach(d => {
    const age = parseInt(d.umur, 10);
    if (isNaN(age)) { ageGroups['N/A']++; }
    else if (age <= 4) { ageGroups['0-4']++; }
    else if (age <= 14) { ageGroups['5-14']++; }
    else if (age <= 24) { ageGroups['15-24']++; }
    else if (age <= 34) { ageGroups['25-34']++; }
    else if (age <= 44) { ageGroups['35-44']++; }
    else if (age <= 54) { ageGroups['45-54']++; }
    else if (age <= 64) { ageGroups['55-64']++; }
    else { ageGroups['65+']++; }
  });
  umurChart.data.labels = Object.keys(ageGroups);
  umurChart.data.datasets[0].data = Object.values(ageGroups);
  umurChart.update();
  const jkCounts = { 'Laki-laki': 0, 'Perempuan': 0, 'Tidak diisi': 0 };
  filtered.forEach(d => {
    if (d.jk === 'Laki-laki') { jkCounts['Laki-laki']++; }
    else if (d.jk === 'Perempuan') { jkCounts['Perempuan']++; }
    else { jkCounts['Tidak diisi']++; }
  });
  jkChart.data.datasets[0].data = [jkCounts['Laki-laki'], jkCounts['Perempuan'], jkCounts['Tidak diisi']];
  jkChart.update();
}

function getColor(val){ const v=Number(val)||0; if(v===0) return '#ffffff'; if(v>0&&v<=50) return '#ffc4c4'; if(v>50&&v<=200) return '#ff7a7a'; return '#cc0000'; }
let geojsonLayer;
let _labels=[];
window._leaf_map = null;
function ensureMap(){ if(window._leaf_map) return window._leaf_map; window._leaf_map=L.map('map',{zoomControl:true,attributionControl:false}); window.addEventListener('resize', ()=>{ try{ window._leaf_map.invalidateSize(); }catch(_){}}); return window._leaf_map; }
let casesByProvince={"Aceh":12,"Sumatera Utara":28};
function totalNational(){ return Object.values(casesByProvince).reduce((a,b)=>a+(+b||0),0); }
function getProvName(props){ return props?.provinsi||props?.Provinsi||props?.PROVINSI||props?.NAME_1||props?.Name||props?.WADMPR||props?.wadmpr||props?.WADMPRV||props?.nama||props?.name||''; }
function styleFeature(feat){ const prov=getProvName(feat.properties||{}); const val=+casesByProvince[prov]||0; return {weight:1,color:'#9ca3af',fillColor:getColor(val),fillOpacity:0.8}; }
function highlightFeature(e){ e.target.setStyle({weight:2,fillOpacity:0.9,color:'#6b7280'}); e.target.bringToFront?.(); }
function resetHighlight(e){ geojsonLayer && geojsonLayer.resetStyle(e.target); }
function onEachFeature(feature, layer){
  const prov=getProvName(feature.properties||{}); const val=+casesByProvince[prov]||0;
  if(prov && !(prov in casesByProvince)) console.warn('⚠ Nama provinsi pada GeoJSON tidak cocok:', prov);
  const pct=totalNational()?((val/totalNational())*100).toFixed(1):'0.0';
  layer.bindTooltip(`${prov||'(tanpa nama)'}: ${val.toLocaleString('id-ID')} kasus`,{sticky:true});
  layer.on({mouseover:highlightFeature,mouseout:resetHighlight,click:()=>{ layer.bindPopup(`<b>${prov||'(tanpa nama)'}</b><br>Kasus: ${val.toLocaleString('id-ID')}<br>Kontribusi nasional: ${pct}%`).openPopup(); }});
}
function addCenterLabels(){
  if(!window._leaf_map||!geojsonLayer) return;
  _labels.forEach(l=>window._leaf_map.removeLayer(l));
  _labels=[];
  geojsonLayer.eachLayer(layer=>{
    const prov=getProvName(layer.feature?.properties||{}); const val=+casesByProvince[prov]||0;
    if(val>0){ const c=layer.getBounds().getCenter(); const t=L.tooltip({permanent:true,direction:'center',className:'prov-label'}).setContent(String(val)).setLatLng(c); _labels.push(t); t.addTo(window._leaf_map); }
  });
}
const legend=L.control({position:'topright'});
legend.onAdd=function(){ const div=L.DomUtil.create('div','legend'); div.innerHTML='<div class="legend-title">Kategori Kasus</div>'+'<div class="legend-row"><span class="swatch" style="background:#ffffff"></span>0</div>'+'<div class="legend-row"><span class="swatch" style="background:#ffc4c4"></span>1–50</div>'+'<div class="legend-row"><span class="swatch" style="background:#ff7a7a"></span>50–200</div>'+'<div class="legend-row"><span class="swatch" style="background:#cc0000"></span>&gt;200</div>'; return div; };
function refreshChoropleth(){ geojsonLayer && geojsonLayer.setStyle(styleFeature); addCenterLabels(); }
async function loadFromUrl(url){
  try{
    const res=await fetch(url,{mode:'cors',cache:'no-store'});
    if(!res.ok) throw new Error('status '+res.status);
    return await res.json();
  }catch(err){
    document.getElementById('mapMsg').textContent = 'Gagal memuat GeoJSON dari GitHub: '+err;
    throw err;
  }
}
function renderChoropleth(geojson){
  ensureMap();
  if(geojsonLayer) window._leaf_map.removeLayer(geojsonLayer);
  geojsonLayer=L.geoJSON(geojson,{style:styleFeature,onEachFeature:onEachFeature}).addTo(window._leaf_map);
  try{ fitIndonesia(); }catch(_){}
  if(!legend._map) legend.addTo(window._leaf_map);
  addCenterLabels();
}
function fitIndonesia(){ if(geojsonLayer){ window._leaf_map.fitBounds(geojsonLayer.getBounds(),{padding:[10,10]}); } }
function exportPNG(){
  if(!window._leaf_map){ alert('Peta belum ditampilkan.'); return; }
  leafletImage(window._leaf_map, function(err, canvas) {
    if(err){ alert('Gagal mengekspor PNG. Coba lagi.'); return; }
    const a = document.createElement('a');
    a.download = `peta-leptospirosis-${new Date().toISOString().slice(0,10)}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
}
function recalcCasesByProvinceFromLocal(){ const arr=loadCases(); const counts={}; arr.forEach(d=>{ const p=d.prov||'(Tidak diisi)'; counts[p]=(counts[p]||0)+1; }); return counts; }
function recalcCasesFromLocalAndRefresh(){ const counts=recalcCasesByProvinceFromLocal(); if(Object.keys(counts).length){ casesByProvince=counts; refreshChoropleth(); } }

function flattenCase(d){
  const row={ 'UUID':d.uuid||'', 'Nama':d.nama,'Jenis Kelamin':d.jk,'Umur':d.umur,'Pekerjaan':d.kerja,'Provinsi':d.prov,'Kab/Kota':d.kab,'Alamat':d.alamat,'Onset':d.onset,'Definisi':d.definisi,'Status Akhir':d.statusAkhir,'Tanggal Status':d.tglStatus,'Saved At':d.savedAt };
  GEJALA.forEach(g=>{ const label=g.label; row['Gejala: '+label]=d.gejala[label]?'Ya':''; row['Tgl '+label]=d.gejalaTgl[label]||''; });
  row['Paparan (2 minggu)']=(d.paparan||[]).filter(x=>x.checked).map(x=>x.label).join('; ');
  const Lb=d.lab||{};
  row['Leukosit (x10^3/µL)']=Lb.leukosit||'';
  row['Trombosit (x10^3/µL)']=Lb.trombosit||'';
  row['Bilirubin (mg/dL)']=Lb.bilirubin||'';
  row['Kreatinin (mg/dL)']=Lb.kreatinin||'';
  const map3=v=>v==='pos'?'Positif':(v==='neg'?'Negatif':(v==='nd'?'Tidak diperiksa':''));
  row['RDT']=map3(Lb.rdt);
  row['MAT']=map3(Lb.mat);
  return row;
}
function exportToExcel(){ const arr=loadCases(); if(arr.length===0){ alert('Tidak ada data untuk diekspor.'); return; } const rows=arr.map(flattenCase); const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Kasus'); XLSX.writeFile(wb,'leptospirosis_cases.xlsx'); }

function parseGVizJSON(text){
  const start=text.indexOf('{');
  const end=text.lastIndexOf('}');
  if(start<0||end<0) throw new Error('Format GViz tidak dikenali');
  const json=JSON.parse(text.slice(start,end+1));
  const table=json.table;
  const headers=(table.cols||[]).map(c=>c.label||c.id);
  const rows=(table.rows||[]).map(r=>(r.c||[]).map(c=>c?(c.v??''):''));
  return rows.map(vals=>{ const o={}; headers.forEach((h,i)=>o[h]=vals[i]); return o; });
}
function flatToCase(r){
  return {
    uuid: r['UUID']||'',
    nama: r['Nama']||'',
    jk: r['Jenis Kelamin']||'',
    umur: r['Umur']||'',
    kerja: r['Pekerjaan']||'',
    prov: r['Provinsi']||'',
    kab: r['Kab/Kota']||'',
    alamat: r['Alamat']||'',
    onset: r['Onset']||'',
    gejala: {}, gejalaTgl: {}, paparan: [],
    lab: {
      leukosit: r['Leukosit (x10^3/µL)']||'',
      trombosit: r['Trombosit (x10^3/µL)']||'',
      bilirubin: r['Bilirubin (mg/dL)']||'',
      kreatinin: r['Kreatinin (mg/dL)']||'',
      rdt: ((r['RDT']||'').toLowerCase().startsWith('pos')?'pos':((r['RDT']||'').toLowerCase().startsWith('neg')?'neg':'nd')),
      mat: ((r['MAT']||'').toLowerCase().startsWith('pos')?'pos':((r['MAT']||'').toLowerCase().startsWith('neg')?'neg':'nd')),
    },
    definisi: r['Definisi']||'',
    statusAkhir: r['Status Akhir']||'',
    tglStatus: r['Tanggal Status']||'',
    savedAt: r['Saved At']||new Date().toISOString()
  };
}
function getKey(d){ return (d && d.uuid) ? ('uuid:'+d.uuid) : ('dup:'+([ (d.nama||'').trim().toLowerCase(), (d.umur||'')+'', (d.alamat||'').trim().toLowerCase(), d.onset||'' ].join('|'))); }
function mergeCases(localArr, remoteArr){
  const byKey = new Map();
  const toDate = s => { try{ return new Date(s); }catch(_){ return new Date(0);} };
  localArr.forEach(d=>{ byKey.set(getKey(d), d); });
  remoteArr.forEach(r=>{
    const k = getKey(r);
    if(!byKey.has(k)){ byKey.set(k, r); }
    else {
      const a = byKey.get(k);
      const tA = toDate(a.savedAt||a.tglStatus||a.onset||'1970-01-01');
      const tB = toDate(r.savedAt||r.tglStatus||r.onset||'1970-01-01');
      if(tB>tA) byKey.set(k, r);
    }
  });
  return Array.from(byKey.values());
}
async function readSheetCases(){
  if(!SPREADSHEET_ID || SPREADSHEET_ID.startsWith('GANTI_')) throw new Error('SPREADSHEET_ID belum diisi');
  const res = await fetch(SHEETS_READ_URL, { mode:'cors', cache:'no-store' });
  const text = await res.text();
  const flat = parseGVizJSON(text);
  return flat.map(flatToCase);
}
async function pullFromSheets(opts={merge:true, silent:false}){
  if(!SPREADSHEET_ID || SPREADSHEET_ID.startsWith('GANTI_')){ if(!opts.silent) alert('SPREADSHEET_ID belum diisi di script.js'); return; }
  try{
    updateSyncStatus('Menarik data dari Google Sheets...');
    const remoteCases = await readSheetCases();
    if(opts.merge){
      const local = loadCases();
      const merged = mergeCases(local, remoteCases);
      if(saveCases(merged)){ renderAll(); updateSyncStatus(`Berhasil sync: ${merged.length} kasus`); if(!opts.silent) alert(`Sync selesai: ${merged.length} kasus`); }
    } else {
      if(saveCases(remoteCases)){ renderAll(); updateSyncStatus(`Berhasil tarik: ${remoteCases.length} kasus`); if(!opts.silent) alert(`Tarik selesai: ${remoteCases.length} kasus`); }
    }
  }catch(err){
    updateSyncStatus('Gagal sync: '+err.message, true);
    if(!opts.silent) alert('Gagal sync dari Sheets: '+err.message);
  }
}
async function sendAllToSheets(replace=false){
  if(!SHEETS_URL || SHEETS_URL.startsWith('GANTI_')){ alert('SHEETS_URL belum diisi di script.js'); return; }
  const arr=loadCases(); if(arr.length===0){ alert('Tidak ada data untuk dikirim.'); return; }
  try{
    updateSyncStatus('Mengirim data ke Google Sheets...');
    const rows=arr.map(flattenCase);

    // Payload disesuaikan dengan Google Apps Script doPost(e)
    const payload = {
      token: ACCESS_TOKEN,
      action: replace ? 'appendBatch' : 'appendBatch',
      rows: rows
    };

    // Gunakan text/plain agar menghindari preflight CORS di Apps Script
    const res = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'cors',
      cache: 'no-store'
    });

    const text = await res.text();
    let result;
    try { result = JSON.parse(text); } catch(_){ throw new Error('Respon bukan JSON: ' + text.slice(0,200)); }

    if(result && result.ok){
      const cnt = typeof result.count === 'number' ? result.count : rows.length;
      updateSyncStatus(`Berhasil kirim ke Sheets (${cnt} baris)`);
      alert('Data berhasil dikirim ke Google Sheets');
    } else {
      throw new Error((result && (result.error || result.message)) || 'Gagal mengirim data');
    }
  }catch(err){
    updateSyncStatus('Gagal kirim: '+err.message, true);
    alert('Gagal mengirim ke Sheets: '+err.message);
  }
}

async function sendReplaceAllToSheets(){
  if(!confirm('Ini akan MENGGANTI SEMUA data di Google Sheets dengan data lokal. Lanjutkan?')) return;
  await sendAllToSheets(true);
}
  const arr=loadCases(); if(arr.length===0){ alert('Tidak ada data untuk dikirim.'); return; }
  try{
    updateSyncStatus('Mengirim data ke Google Sheets...');
    const rows=arr.map(flattenCase);
    const res=await fetch(SHEETS_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:replace?'replaceAll':'append',data:rows})});
    const result=await res.json();
    if(result.status==='success'){ updateSyncStatus('Berhasil kirim ke Sheets'); alert('Data berhasil dikirim ke Google Sheets'); }
    else { throw new Error(result.message||'Gagal'); }
  }catch(err){
    updateSyncStatus('Gagal kirim: '+err.message, true);
    alert('Gagal mengirim ke Sheets: '+err.message);
  }
}
async function sendReplaceAllToSheets(){
  if(!confirm('Ini akan mengganti SEMUA data di Google Sheets dengan data lokal. Lanjutkan?')) return;
  await sendAllToSheets(true);
}
let autoPullTimer = null;
function scheduleAutoPull() {
  if (!AUTO_SYNC_ENABLED || !syncStatus.isOnline) return;
  if (autoPullTimer) clearTimeout(autoPullTimer);
  autoPullTimer = setTimeout(async () => {
    if (!syncStatus.isSyncing && syncStatus.isOnline) {
      syncStatus.isSyncing = true;
      await pullFromSheets({ merge: true, silent: true });
      syncStatus.isSyncing = false;
    }
    scheduleAutoPull();
  }, AUTO_SYNC_INTERVAL_MS);
}
async function initMap() {
  try {
    const geojson = await loadFromUrl(DEFAULT_GH);
    renderChoropleth(geojson);
    recalcCasesFromLocalAndRefresh();
  } catch (err) {
    console.error('Failed to load map:', err);
    document.getElementById('mapMsg').textContent = 'Gagal memuat peta. Periksa koneksi internet.';
  }
}
function bindDefinisiRealtime(){
  ['leukosit','trombosit','bilirubin','amilase','cpk'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.addEventListener('input', updateDefinisiBadge); }
  });
  ['proteinuria','hematuria'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.addEventListener('change', updateDefinisiBadge); }
  });
}
function initApp() {
  buildGejalaGrid();
  buildPaparanGrid();
  renderAll();
  _syncTimeModeUI();
  fTimeMode?.addEventListener('change', _syncTimeModeUI);
  bindRapidRadioUpdates();
  bindDefinisiRealtime();
  setupActionButtons();
  _bindHeaderShadow();
  document.getElementById('applyFilter').addEventListener('click', updateCharts);
  document.getElementById('recalcMap')?.addEventListener('click', recalcCasesFromLocalAndRefresh);
  document.getElementById('exportPng')?.addEventListener('click', exportPNG);
  document.getElementById('pullSheets')?.addEventListener('click', ()=>pullFromSheets({merge:true, silent:false}));
  document.getElementById('syncSheets')?.addEventListener('click', ()=>sendAllToSheets(false));
  document.getElementById('fullSyncSheets')?.addEventListener('click', sendReplaceAllToSheets);
  initMap();
  setTimeout(() => {
    try{
      if(window._leaf_map) {
        window._leaf_map.invalidateSize();
        fitIndonesia();
      }
    } catch(e) {
      console.warn("Map resize failed:", e);
    }
  }, 500);
  scheduleAutoPull();
}
(function(){
  const OK_KEY = 'lepto_token_ok';
  function hasOk(){ try{ return localStorage.getItem(OK_KEY)==='1'; }catch(_){ return false; } }
  let unlocked=false;
  function hideLock(){
    const el=document.getElementById('lock');
    if(el){ el.remove(); document.body.classList.remove('locked'); }
  }
  function showLock(){
    const el=document.getElementById('lock');
    if(!el) return;
    document.body.classList.add('locked');
    el.style.display = 'flex';
    document.getElementById('tokenInput')?.focus();
  }
  function bindHandlers(){
    const form=document.getElementById('lockForm');
    const err=document.getElementById('lockErr');
    const handleSubmit = (e) => { e.preventDefault(); verifyToken(); };
    if(err) err.style.display='none';
    if(form) form.addEventListener('submit', handleSubmit);
  }
  function afterUnlock(){
    if(unlocked) return;
    unlocked=true;
    hideLock();
    initApp();
  }
  function verifyToken(){
    const val=(document.getElementById('tokenInput')?.value||'').trim();
    const err=document.getElementById('lockErr');
    if(val===ACCESS_TOKEN){
      try{ localStorage.setItem(OK_KEY,'1'); }catch(_){ }
      afterUnlock();
    } else {
      if(err){ err.textContent='Token salah. Coba lagi.'; err.style.display='block'; }
    }
  }
  function autoUnlockFromURL(){
    try{
      const sp=new URLSearchParams(location.search);
      const t=sp.get('token');
      const skip=sp.get('skipToken')==='1';
      if(skip || t===ACCESS_TOKEN){
        try{ localStorage.setItem(OK_KEY,'1'); }catch(_){ }
        afterUnlock();
        return true;
      }
    }catch(_){}
    return false;
  }
  function start(){
    bindHandlers();
    if(autoUnlockFromURL()) return;
    if(hasOk()){ afterUnlock(); return; }
    showLock();
  }
  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  window.__leptoToken={ verifyToken, showLock, afterUnlock };
})();