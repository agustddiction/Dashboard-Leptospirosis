
/*! App Core (restored features) v2.0 */
(function(){
  'use strict';
  const $  = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ======= Data Master =======
  const GEJALA = [
    {id:'demam', label:'Demam'},
    {id:'nyeri_otot', label:'Nyeri otot'},
    {id:'nyeri_kepala', label:'Sakit kepala'},
    {id:'kuning', label:'Kuning (ikterus)'},
    {id:'muntah', label:'Mual / muntah'},
    {id:'konjungtivitis', label:'Mata merah (konjungtivitis)'},
    {id:'batuk', label:'Batuk'},
    {id:'ruam', label:'Ruam kulit'},
    {id:'sesak', label:'Sesak napas'}
  ];
  const PAPARAN = [
    'Kontak dengan banjir',
    'Kontak sungai/danau',
    'Sawah/perkebunan tanpa alas kaki',
    'Kontak erat dengan hewan terinfeksi',
    'Kontak dengan hewan mati/cairan',
    'Menangani spesimen leptospirosis',
    'Pekerjaan berisiko (petani, RPH, dsb)',
    'Hobi/olahraga air (berenang, memancing)'
  ];

  // ===== Utilities =====
  function fmtDate(d){
    if(!d) return '';
    if(typeof d === 'string') return d.slice(0,10);
    try{ return new Date(d).toISOString().slice(0,10); }catch(_){ return ''; }
  }
  function genUUID(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);}); }

  // ===== Storage =====
  const LS_KEY = 'lepto_cases';
  function loadCases(){ try{ const raw=localStorage.getItem(LS_KEY); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }catch(_){ return []; } }
  function saveCases(arr){ try{ localStorage.setItem(LS_KEY, JSON.stringify(arr||[])); }catch(_){} }

  // ===== State =====
  let CASES = loadCases();
  window.__CASES__ = CASES;

  // ===== UI Builders: Gejala & Paparan =====
  function renderGejalaPaparan(){
    const gWrap = $('gejalaGrid');
    if (gWrap && !gWrap.dataset.built){
      gWrap.innerHTML = '';
      GEJALA.forEach(g => {
        const id = 'g_'+g.id;
        const div = document.createElement('label');
        div.className = 'choice';
        div.innerHTML = `<input type="checkbox" id="${id}" /> ${g.label}`;
        gWrap.appendChild(div);
        $(''+id)?.addEventListener('change', onAnyInputChanged);
      });
      gWrap.dataset.built = '1';
    }
    const pWrap = $('paparanGrid');
    if (pWrap && !pWrap.dataset.built){
      pWrap.innerHTML = '';
      PAPARAN.forEach((p,idx)=>{
        const id = 'p_'+idx;
        const div = document.createElement('label');
        div.className = 'choice';
        div.innerHTML = `<input type="checkbox" id="${id}" /> ${p}`;
        pWrap.appendChild(div);
        $(''+id)?.addEventListener('change', onAnyInputChanged);
      });
      pWrap.dataset.built = '1';
    }
  }

  // ===== Definisi Kasus (otomatis) =====
  function getRadio(n){ const el = document.querySelector(`input[name="${n}"]:checked`); return el?el.value:''; }
  function computeDefinisi(){
    const S = {};
    GEJALA.forEach(g => { S[g.id] = !!$('g_'+g.id)?.checked; });
    const anyExposure = PAPARAN.some((_, idx) => !!$('p_'+idx)?.checked);

    // Lab groups - deteksi nama yang dipakai di HTML (rdt/mat/pcr)
    const labPCR = getRadio('pcr') || getRadio('lab_pcr');
    const labMAT = getRadio('mat') || getRadio('lab_mat');
    const labRDT = getRadio('rdt') || getRadio('lab_rdt');

    const mayor = ['demam','nyeri_otot','kuning','muntah','konjungtivitis','nyeri_kepala'];
    const mayorCount = mayor.reduce((a,k)=> a + (S[k]?1:0), 0);

    let status = 'Suspek';
    if (labPCR === 'pos' || labMAT === 'pos') status = 'Terkonfirmasi';
    else if (labRDT === 'pos' || (mayorCount>=3 && anyExposure)) status = 'Probabel';
    else if ((mayorCount>=2) || (mayorCount>=1 && anyExposure)) status = 'Suspek';
    if ((labPCR==='neg' && labMAT==='neg' && labRDT==='neg') && mayorCount < 2) status = 'Discarded';
    return status;
  }
  function updateDefBadge(){
    const st = computeDefinisi();
    const el = $('defBadge');
    if (el) {
      el.textContent = st;
      el.className = 'tag ' + (st==='Terkonfirmasi'?'ok': st==='Probabel'?'warn' : st==='Suspek'?'muted':'bad');
    }
  }

  // ===== Onset otomatis (sederhana) =====
  function updateOnsetTag(){
    // Pakai tanggal manual jika ada, else kosong (karena tidak ada tanggal per gejala)
    const manual = $('onsetManual')?.value || '';
    $('onsetTag') && ($('onsetTag').textContent = manual || '—');
  }

  function onAnyInputChanged(){
    updateDefBadge();
    updateOnsetTag();
    refreshCharts();
  }

  // ===== Simpan data (minimal, mengikuti id di HTML) =====
  function getFormData(){
    return {
      uuid: genUUID(),
      nama: $('nama')?.value || '',
      nik: $('nik')?.value || '',
      umur: $('umur')?.value || '',
      jk: getRadio('jk') || '',
      provinsi: $('prov')?.value || '',
      kabupaten: $('kab')?.value || '',
      alamat: $('alamat')?.value || '',
      tanggal_onset: $('onsetManual')?.value || '',
      definisi: computeDefinisi(),
      lat: parseFloat($('lat')?.value||'')||null,
      lng: parseFloat($('lng')?.value||'')||null
    };
  }
  function handleSubmit(){
    const data = getFormData();
    CASES = loadCases();
    CASES.push(data);
    saveCases(CASES);
    refreshAll();
    alert('Kasus disimpan.');
  }

  // ===== Filters =====
  function collectOptionsFromSelect(selId){
    const sel = $(selId); if(!sel) return [];
    return Array.from(sel.options).map(o=>o.value).filter(Boolean);
  }
  function buildFilterOptions(){
    // Gunakan opsi yang ada di form input jika tersedia
    const provs = collectOptionsFromSelect('prov');
    const fProv = $('fProv'); if (fProv && fProv.options.length<=1 && provs.length){
      fProv.innerHTML = '<option value="">Semua</option>' + provs.map(p=>`<option>${p}</option>`).join('');
    }
    // kab akan tergantung prov terpilih; dibiarkan saat ini.
  }
  function applyFilters(){
    refreshAll();
  }

  // ===== Charts (Chart.js) =====
  let trendChart, kabChart;
  function computeFiltered(){
    // Placeholder sederhana: saat ini belum menerapkan filter kompleks -> kembalikan semua
    return loadCases();
  }
  function refreshCharts(){
    const data = computeFiltered();
    // By month (YYYY-MM from tanggal_onset)
    const byMonth = {};
    data.forEach(it=>{
      const m = (it.tanggal_onset || '').slice(0,7) || '—';
      byMonth[m] = (byMonth[m]||0)+1;
    });
    const months = Object.keys(byMonth).sort();
    const mVals = months.map(k=>byMonth[k]);

    const ctx1 = $('trendChart')?.getContext?.('2d');
    if (ctx1){
      if (trendChart) { trendChart.destroy(); }
      trendChart = new Chart(ctx1, {
        type: 'line',
        data: { labels: months, datasets: [{ label: 'Kasus per Bulan', data: mVals }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // By kabupaten
    const byKab = {};
    data.forEach(it=>{
      const k = it.kabupaten || '—';
      byKab[k] = (byKab[k]||0)+1;
    });
    const kabKeys = Object.keys(byKab).sort((a,b)=>byKab[b]-byKab[a]).slice(0,12);
    const kabVals = kabKeys.map(k=>byKab[k]);
    const ctx2 = $('kabChart')?.getContext?.('2d');
    if (ctx2){
      if (kabChart) { kabChart.destroy(); }
      kabChart = new Chart(ctx2, {
        type: 'bar',
        data: { labels: kabKeys, datasets: [{ label: 'Top Kabupaten', data: kabVals }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  }

  // ===== Map (Leaflet) =====
  let map;
  function initMap(){
    const mapDiv = $('map');
    if (!mapDiv) return;
    if (map) { map.invalidateSize(); return; }
    map = L.map(mapDiv).setView([-2.5, 118], 4); // Indonesia view
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    drawMarkers();
  }
  function drawMarkers(){
    if (!map) return;
    // Remove old layers except tile
    map.eachLayer(l=>{ if(!(l instanceof L.TileLayer)) { try{ map.removeLayer(l);}catch(_){}} });
    const data = computeFiltered();
    const pts = [];
    data.forEach(it=>{
      if (it.lat && it.lng){
        const m = L.marker([it.lat, it.lng]).addTo(map);
        m.bindPopup(`<b>${it.nama||'Kasus'}</b><br>${it.kabupaten||''}, ${it.provinsi||''}<br>${it.tanggal_onset||''}`);
        pts.push([it.lat, it.lng]);
      }
    });
    const msg = $('mapMsg');
    if (pts.length){
      const bounds = L.latLngBounds(pts);
      try{ map.fitBounds(bounds.pad(0.15)); }catch(_){}
      if (msg) msg.textContent = '';
    } else {
      if (msg) msg.textContent = 'Belum ada titik koordinat pada data kasus.';
    }
  }

  // ===== Refresh helpers =====
  function refreshAll(){
    buildFilterOptions();
    updateDefBadge();
    updateOnsetTag();
    refreshCharts();
    initMap();
    drawMarkers();
  }

  // ===== Wire & Boot =====
  function wire(){
    $('simpan')?.addEventListener('click', (e)=>{ e.preventDefault(); handleSubmit(); });
    $('btnFilter')?.addEventListener('click', (e)=>{ e.preventDefault(); applyFilters(); });
    $('recalcMap')?.addEventListener('click', (e)=>{ e.preventDefault(); drawMarkers(); });

    // Any input changes trigger recompute
    ['input','change'].forEach(evt => {
      document.addEventListener(evt, (e)=>{
        const id = (e.target && e.target.id) || '';
        if (id.startsWith('g_') || id.startsWith('p_') || ['onsetManual'].includes(id)) {
          onAnyInputChanged();
        }
      }, true);
    });
  }

  function boot(){
    renderGejalaPaparan();
    wire();
    refreshAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Exports for gate
  window.renderTable = function(){}; // not used by this layout
  window.renderCounts = function(){};
  window.updateCharts = refreshCharts;
  window.recalcCasesFromLocalAndRefresh = refreshAll;
  window.initMap = initMap;
  window.scheduleAutoPull = function(){};
})();
