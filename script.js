// =====================
// CONFIGURATION
// =====================
const ACCESS_TOKEN = 'ZOOLEPTO123';
const DEFAULT_GH = 'https://raw.githubusercontent.com/timkerptvz/Dashboard-Leptospirosis/main/provinsi.json';

// =====================
// DATA STRUCTURES
// =====================
let PROV_KAB = {};
fetch('https://raw.githubusercontent.com/agustddiction/Dashboard-Leptospirosis/main/kabkota.json')
  .then(r => r.json())
  .then(j => { PROV_KAB = j; initProvKab(); })
  .catch(() => { PROV_KAB = {"Aceh": ["Kabupaten Aceh Besar"]}; initProvKab(); });

const GEJALA = [
  {id: "demam", label: "Demam akut"},
  {id: "nyeriKepala", label: "Nyeri kepala"},
  {id: "mialgia", label: "Mialgia"},
  {id: "malaise", label: "Malaise / Lemah"},
  {id: "conj", label: "Conjunctival suffusion"},
  {id: "nyeriBetis", label: "Nyeri betis"},
  {id: "jaundice", label: "Jaundice / Ikterik"},
  {id: "batuk", label: "Batuk dgn/tnp darah"},
  {id: "perdarahan", label: "Manifestasi perdarahan"},
  {id: "anuria", label: "Anuria / Oliguria"},
  {id: "aritmia", label: "Aritmia jantung"},
  {id: "ruam", label: "Ruam kulit"},
  {id: "sesak", label: "Sesak napas"},
];

const PAPARAN = [
  "Kontak dengan banjir",
  "Kontak sungai/danau",
  "Sawah/perkebunan tanpa alas kaki",
  "Kontak erat dengan hewan terinfeksi",
  "Pekerjaan berisiko",
  "Sering melihat tikus"
];

// =====================
// STATE VARIABLES
// =====================
let editingIndex = -1;
let editingUUID = null;

// =====================
// PROVINCE/CITY INITIALIZATION
// =====================
function initProvKab() {
  const provs = Object.keys(PROV_KAB).sort();
  const prov = document.getElementById('prov');
  const kab = document.getElementById('kab');
  
  prov.innerHTML = '<option value="">Pilih...</option>';
  provs.forEach(x => prov.appendChild(new Option(x, x)));
  
  prov.addEventListener('change', () => {
    kab.innerHTML = '<option value="">Pilih...</option>';
    if (prov.value && PROV_KAB[prov.value]) {
      PROV_KAB[prov.value].forEach(x => kab.appendChild(new Option(x, x)));
    }
  });
}

// =====================
// UTILITY FUNCTIONS
// =====================
function genUUID() {
  try {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch(_) {}
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// =====================
// LOCAL STORAGE FUNCTIONS
// =====================
function loadCases() {
  try {
    const data = localStorage.getItem('lepto_cases');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading:', e);
    return [];
  }
}

function saveCases(arr) {
  try {
    localStorage.setItem('lepto_cases', JSON.stringify(arr));
    return true;
  } catch (e) {
    console.error('Error saving:', e);
    alert('Gagal menyimpan data.');
    return false;
  }
}

// =====================
// CASE CALCULATIONS
// =====================
function calculateCFR(cases) {
  const meninggal = cases.filter(d => d.statusAkhir === 'Meninggal').length;
  const total = cases.length;
  return total > 0 ? ((meninggal / total) * 100).toFixed(2) : '0.00';
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
  const matPos = lab.mat === 'pos';
  if (matPos) return 'Konfirmasi';
  
  const hasSymptoms = Object.values(gejala).some(v => v);
  const hasExposure = paparan.some(p => p.checked);
  const rdtPos = lab.rdt === 'pos';
  
  if (rdtPos && hasSymptoms && hasExposure) return 'Probable';
  if (hasSymptoms && hasExposure) return 'Suspek';
  return 'Tidak terdefinisi';
}

// =====================
// RENDER FUNCTIONS
// =====================
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
      <td><span class="tag ${d.definisi === 'Konfirmasi' ? 'ok' : (d.definisi === 'Probable' ? 'warn' : 'neutral')}">${d.definisi || '-'}</span></td>
      <td>
        <button class="btn small" onclick="editCase(${i})">Edit</button>
        <button class="btn small danger" onclick="deleteCase(${i})">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAll() {
  renderTable();
  renderCounts();
  recalcCasesFromLocalAndRefresh();
}

// =====================
// FORM FUNCTIONS
// =====================
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

  return {
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
      rdt: getRdVal('rdt'),
      mat: getRdVal('mat'),
      serovar: document.getElementById('serovar').value.trim(),
    },
    definisi: calculateDefinisi(gejala, paparan, {
      rdt: getRdVal('rdt'),
      mat: getRdVal('mat')
    }),
    statusAkhir: document.getElementById('statusAkhir').value,
    tglStatus: document.getElementById('tglStatus').value,
    obat: document.getElementById('obat').value.trim(),
    savedAt: new Date().toISOString()
  };
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
    if (dt) {
      dt.value = '';
      dt.style.display = 'none';
    }
  });
  
  document.getElementById('onsetManual').value = '';
  
  PAPARAN.forEach(label => {
    const cb = document.getElementById('pap_' + label.replace(/[^a-zA-Z0-9]/g, '_'));
    if (cb) cb.checked = false;
  });
  
  ['leukosit', 'trombosit', 'bilirubin', 'serovar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  ['rdt', 'mat'].forEach(name => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(rd => rd.checked = false);
  });
  
  document.getElementById('statusAkhir').value = '';
  document.getElementById('tglStatus').value = '';
  document.getElementById('obat').value = '';
  
  editingIndex = -1;
  editingUUID = null;
  document.body.classList.remove('editing');
  
  updateOnsetTag();
  updateDefinisiBadge();
}

// =====================
// UI UPDATE FUNCTIONS
// =====================
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

  const def = calculateDefinisi(gejala, paparan, {
    rdt: getRdVal('rdt'),
    mat: getRdVal('mat')
  });

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

function updateOnsetTag() {
  const gejalaTgl = {};
  GEJALA.forEach(g => {
    const cb = document.getElementById(g.id);
    const dt = document.getElementById(g.id + 'Tgl');
    gejalaTgl[g.label] = (dt && cb && cb.checked) ? dt.value : '';
  });
  
  const onset = calculateOnset(gejalaTgl);
  const tag = document.getElementById('onsetTag');
  if (tag) tag.textContent = onset || '—';
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

// =====================
// BUILD GRIDS
// =====================
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
  ['rdt', 'mat'].forEach(name => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(rd => {
      rd.addEventListener('change', updateDefinisiBadge);
    });
  });
}

// =====================
// CASE OPERATIONS
// =====================
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
  document.getElementById('serovar').value = lab.serovar || '';
  
  const setRd = (name, val) => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(rd => {
      rd.checked = (rd.value === val);
    });
  };
  
  setRd('rdt', lab.rdt || 'nd');
  setRd('mat', lab.mat || 'nd');
  
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
  }
};

// =====================
// ACTION BUTTONS
// =====================
function setupActionButtons() {
  document.getElementById('simpan').addEventListener('click', (e) => {
    e.preventDefault();
    const data = getFormData();
    
    if (!data.nama) {
      alert('Nama wajib diisi.');
      return;
    }
    if (!data.prov || !data.kab) {
      alert('Provinsi dan Kabupaten/Kota wajib dipilih.');
      return;
    }
    
    const arr = loadCases();
    if (editingIndex >= 0) {
      arr[editingIndex] = data;
    } else {
      arr.push(data);
    }
    
    if (saveCases(arr)) {
      resetForm();
      renderAll();
      alert('Kasus disimpan.');
    }
  });
  
  document.getElementById('cancelEdit').addEventListener('click', (e) => {
    e.preventDefault();
    resetForm();
  });
  
  document.getElementById('reset').addEventListener('click', (e) => {
    e.preventDefault();
    resetForm();
  });
  
  document.getElementById('exportExcel').addEventListener('click', exportToExcel);
}

// =====================
// EXCEL EXPORT
// =====================
function flattenCase(d) {
  const row = {
    'UUID': d.uuid || '',
    'Nama': d.nama,
    'Jenis Kelamin': d.jk,
    'Umur': d.umur,
    'Pekerjaan': d.kerja,
    'Provinsi': d.prov,
    'Kab/Kota': d.kab,
    'Alamat': d.alamat,
    'Onset': d.onset,
    'Definisi': d.definisi,
    'Status Akhir': d.statusAkhir,
    'Tanggal Status': d.tglStatus
  };
  
  GEJALA.forEach(g => {
    const label = g.label;
    row['Gejala: ' + label] = d.gejala[label] ? 'Ya' : '';
    row['Tgl ' + label] = d.gejalaTgl[label] || '';
  });
  
  row['Paparan'] = (d.paparan || []).filter(x => x.checked).map(x => x.label).join('; ');
  
  const Lb = d.lab || {};
  row['Leukosit'] = Lb.leukosit || '';
  row['Trombosit'] = Lb.trombosit || '';
  row['Bilirubin'] = Lb.bilirubin || '';
  
  const map3 = v => v === 'pos' ? 'Positif' : (v === 'neg' ? 'Negatif' : 'Tidak diperiksa');
  row['RDT'] = map3(Lb.rdt);
  row['MAT'] = map3(Lb.mat);
  
  return row;
}

function exportToExcel() {
  const arr = loadCases();
  if (arr.length === 0) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }
  
  const rows = arr.map(flattenCase);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kasus');
  XLSX.writeFile(wb, 'leptospirosis_cases.xlsx');
}

// =====================
// MAP FUNCTIONS
// =====================
function getColor(val) {
  const v = Number(val) || 0;
  if (v === 0) return '#ffffff';
  if (v > 0 && v <= 50) return '#ffc4c4';
  if (v > 50 && v <= 200) return '#ff7a7a';
  return '#cc0000';
}

let geojsonLayer;
let _labels = [];
window._leaf_map = null;

function ensureMap() {
  if (window._leaf_map) return window._leaf_map;
  window._leaf_map = L.map('map', { zoomControl: true, attributionControl: false });
  window.addEventListener('resize', () => {
    try {
      window._leaf_map.invalidateSize();
    } catch(_) {}
  });
  return window._leaf_map;
}

let casesByProvince = {};

function totalNational() {
  return Object.values(casesByProvince).reduce((a, b) => a + (+b || 0), 0);
}

function getProvName(props) {
  return props?.provinsi || props?.Provinsi || props?.PROVINSI || 
         props?.NAME_1 || props?.Name || props?.WADMPR || 
         props?.wadmpr || props?.WADMPRV || props?.nama || props?.name || '';
}

function styleFeature(feat) {
  const prov = getProvName(feat.properties || {});
  const val = +casesByProvince[prov] || 0;
  return { weight: 1, color: '#9ca3af', fillColor: getColor(val), fillOpacity: 0.8 };
}

function highlightFeature(e) {
  e.target.setStyle({ weight: 2, fillOpacity: 0.9, color: '#6b7280' });
  e.target.bringToFront?.();
}

function resetHighlight(e) {
  geojsonLayer && geojsonLayer.resetStyle(e.target);
}

function onEachFeature(feature, layer) {
  const prov = getProvName(feature.properties || {});
  const val = +casesByProvince[prov] || 0;
  const pct = totalNational() ? ((val / totalNational()) * 100).toFixed(1) : '0.0';
  
  layer.bindTooltip(`${prov || '(tanpa nama)'}: ${val.toLocaleString('id-ID')} kasus`, { sticky: true });
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: () => {
      layer.bindPopup(`<b>${prov || '(tanpa nama)'}</b><br>Kasus: ${val.toLocaleString('id-ID')}<br>Kontribusi: ${pct}%`).openPopup();
    }
  });
}

function addCenterLabels() {
  if (!window._leaf_map || !geojsonLayer) return;
  
  _labels.forEach(l => window._leaf_map.removeLayer(l));
  _labels = [];
  
  geojsonLayer.eachLayer(layer => {
    const prov = getProvName(layer.feature?.properties || {});
    const val = +casesByProvince[prov] || 0;
    if (val > 0) {
      const c = layer.getBounds().getCenter();
      const t = L.tooltip({ permanent: true, direction: 'center', className: 'prov-label' })
        .setContent(String(val))
        .setLatLng(c);
      _labels.push(t);
      t.addTo(window._leaf_map);
    }
  });
}

const legend = L.control({ position: 'topright' });
legend.onAdd = function() {
  const div = L.DomUtil.create('div', 'legend');
  div.innerHTML = '<div class="legend-title">Kategori Kasus</div>' +
    '<div class="legend-row"><span class="swatch" style="background:#ffffff"></span>0</div>' +
    '<div class="legend-row"><span class="swatch" style="background:#ffc4c4"></span>1–50</div>' +
    '<div class="legend-row"><span class="swatch" style="background:#ff7a7a"></span>50–200</div>' +
    '<div class="legend-row"><span class="swatch" style="background:#cc0000"></span>&gt;200</div>';
  return div;
};

function refreshChoropleth() {
  geojsonLayer && geojsonLayer.setStyle(styleFeature);
  addCenterLabels();
}

async function loadFromUrl(url) {
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP status ' + res.status);
    return await res.json();
  } catch (err) {
    console.error('Load URL failed:', err);
    throw err;
  }
}

function renderChoropleth(geojson) {
  ensureMap();
  if (geojsonLayer) window._leaf_map.removeLayer(geojsonLayer);
  
  geojsonLayer = L.geoJSON(geojson, { 
    style: styleFeature, 
    onEachFeature: onEachFeature 
  }).addTo(window._leaf_map);
  
  try {
    fitIndonesia();
  } catch(_) {}
  
  if (!legend._map) legend.addTo(window._leaf_map);
  addCenterLabels();
}

function fitIndonesia() {
  if (geojsonLayer) {
    window._leaf_map.fitBounds(geojsonLayer.getBounds(), { padding: [10, 10] });
  }
}

function exportPNG() {
  if (!window._leaf_map) {
    alert('Peta belum ditampilkan.');
    return;
  }
  
  leafletImage(window._leaf_map, function(err, canvas) {
    if (err) {
      alert('Gagal mengekspor PNG.');
      return;
    }
    const a = document.createElement('a');
    a.download = `peta-leptospirosis-${new Date().toISOString().slice(0, 10)}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
}

function recalcCasesByProvinceFromLocal() {
  const arr = loadCases();
  const counts = {};
  arr.forEach(d => {
    const p = d.prov || '(Tidak diisi)';
    counts[p] = (counts[p] || 0) + 1;
  });
  return counts;
}

function recalcCasesFromLocalAndRefresh() {
  const counts = recalcCasesByProvinceFromLocal();
  if (Object.keys(counts).length) {
    casesByProvince = counts;
    refreshChoropleth();
  }
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

// =====================
// MAIN INIT FUNCTION
// =====================
function initApp() {
  buildGejalaGrid();
  buildPaparanGrid();
  renderAll();
  bindRapidRadioUpdates();
  setupActionButtons();
  
  document.getElementById('recalcMap')?.addEventListener('click', recalcCasesFromLocalAndRefresh);
  document.getElementById('exportPng')?.addEventListener('click', exportPNG);
  
  initMap();
  
  setTimeout(() => {
    try {
      if (window._leaf_map) {
        window._leaf_map.invalidateSize();
        fitIndonesia();
      }
    } catch (e) {
      console.warn("Map resize failed:", e);
    }
  }, 500);
}

// =====================
// TOKEN PROTECTION
// =====================
(function() {
  const OK_KEY = 'lepto_token_ok';
  let unlocked = false;
  
  function hasOk() {
    try {
      return localStorage.getItem(OK_KEY) === '1';
    } catch(_) {
      return false;
    }
  }
  
  function setOk() {
    try {
      localStorage.setItem(OK_KEY, '1');
      return true;
    } catch(_) {
      return false;
    }
  }
  
  function hideLock() {
    const el = document.getElementById('lock');
    if (el) {
      el.style.display = 'none';
      document.body.classList.remove('locked');
    }
  }
  
  function showLock() {
    const el = document.getElementById('lock');
    if (!el) return;
    document.body.classList.add('locked');
    el.style.display = 'flex';
    const input = document.getElementById('tokenInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
  }
  
  function afterUnlock() {
    if (unlocked) return;
    unlocked = true;
    console.log('✓ Token verified, initializing app...');
    hideLock();
    initApp();
  }
  
  function verifyToken() {
    const input = document.getElementById('tokenInput');
    const err = document.getElementById('lockErr');
    const val = (input?.value || '').trim();
    
    if (err) err.style.display = 'none';
    
    if (val === ACCESS_TOKEN) {
      if (setOk()) {
        afterUnlock();
      } else {
        if (err) {
          err.textContent = 'Gagal menyimpan token. Coba lagi.';
          err.style.display = 'block';
        }
      }
    } else {
      if (err) {
        err.textContent = 'Token salah. Coba lagi.';
        err.style.display = 'block';
      }
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  }
  
  function bindHandlers() {
    const form = document.getElementById('lockForm');
    const err = document.getElementById('lockErr');
    
    if (err) err.style.display = 'none';
    
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        verifyToken();
      });
    }
    
    const btn = document.getElementById('unlockBtn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        verifyToken();
      });
    }
  }
  
  function autoUnlockFromURL() {
    try {
      const sp = new URLSearchParams(location.search);
      const t = sp.get('token');
      const skip = sp.get('skipToken') === '1';
      
      if (skip || t === ACCESS_TOKEN) {
        setOk();
        afterUnlock();
        return true;
      }
    } catch(_) {}
    return false;
  }
  
  function start() {
    bindHandlers();
    
    if (autoUnlockFromURL()) return;
    
    if (hasOk()) {
      afterUnlock();
      return;
    }
    
    showLock();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  
  window.__leptoToken = { verifyToken, showLock, afterUnlock };
})();