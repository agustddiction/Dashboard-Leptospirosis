
/*! App Core (restored features) v2.0 */
(function(){
  'use strict';
  const $  = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

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

  function fmtDate(d){
    if(!d) return '';
    if(typeof d === 'string') return d.slice(0,10);
    try{ return new Date(d).toISOString().slice(0,10); }catch(_){ return ''; }
  }
  function genUUID(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);}); }

  const LS_KEY = 'lepto_cases';
  function loadCases(){ try{ const raw=localStorage.getItem(LS_KEY); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }catch(_){ return []; } }
  function saveCases(arr){ try{ localStorage.setItem(LS_KEY, JSON.stringify(arr||[])); }catch(_){} }

  let CASES = loadCases();
  window.__CASES__ = CASES;

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

  function getRadio(n){ const el = document.querySelector(`input[name="${n}"]:checked`); return el?el.value:''; }
  function computeDefinisi(){
    const S = {};
    GEJALA.forEach(g => { S[g.id] = !!$('g_'+g.id)?.checked; });
    const anyExposure = PAPARAN.some((_, idx) => !!$('p_'+idx)?.checked);
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
  function updateOnsetTag(){
    const manual = $('onsetManual')?.value || '';
    $('onsetTag') && ($('onsetTag').textContent = manual || '—');
  }
  
  function updateOnsetVisibility(){
    const any = Array.from(document.querySelectorAll('#gejalaGrid input[type=checkbox]')).some(x=>x.checked);
    const wrap = document.getElementById('manualOnsetWrap');
    if (wrap){ wrap.classList.toggle('hidden', !any); }
  }
  function onAnyInputChanged(){ updateDefBadge(); updateOnsetTag(); updateOnsetVisibility(); refreshCharts(); drawChoropleth(); }

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

  function buildFilterOptions(){
    const provs = Array.from(document.getElementById('prov')?.options||[]).map(o=>o.value).filter(Boolean);
    const fProv = $('fProv'); if (fProv && fProv.options.length<=1 && provs.length){
      fProv.innerHTML = '<option value="">Semua</option>' + provs.map(p=>`<option>${p}</option>`).join('');
    }
  }
  function applyFilters(){ refreshAll(); }

  let trendChart, kabChart;
  function computeFiltered(){ return loadCases(); }
  function refreshCharts(){
    const data = computeFiltered();
    const byMonth = {};
    data.forEach(it=>{ const m=(it.tanggal_onset||'').slice(0,7)||'—'; byMonth[m]=(byMonth[m]||0)+1; });
    const months=Object.keys(byMonth).sort(); const mVals=months.map(k=>byMonth[k]);
    const ctx1 = document.getElementById('trendChart')?.getContext?.('2d');
    if (ctx1){
      if (trendChart) trendChart.destroy();
      trendChart = new Chart(ctx1, { type:'line', data:{ labels:months, datasets:[{ label:'Kasus per Bulan', data:mVals }] }, options:{ responsive:true, maintainAspectRatio:false }});
    }
    const byKab = {}; data.forEach(it=>{ const k=it.kabupaten||'—'; byKab[k]=(byKab[k]||0)+1; });
    const kabKeys=Object.keys(byKab).sort((a,b)=>byKab[b]-byKab[a]).slice(0,12); const kabVals=kabKeys.map(k=>byKab[k]);
    const ctx2 = document.getElementById('kabChart')?.getContext?.('2d');
    if (ctx2){
      if (kabChart) kabChart.destroy();
      kabChart = new Chart(ctx2, { type:'bar', data:{ labels:kabKeys, datasets:[{ label:'Top Kabupaten', data:kabVals }] }, options:{ responsive:true, maintainAspectRatio:false }});
    }
  }

  catch(_){}} });
    const data = computeFiltered(); const pts=[];
    data.forEach(it=>{ if(it.lat && it.lng){ const m=L.marker([it.lat,it.lng]).addTo(map); m.bindPopup(`<b>${it.nama||'Kasus'}</b><br>${it.kabupaten||''}, ${it.provinsi||''}<br>${it.tanggal_onset||''}`); pts.push([it.lat,it.lng]); } });
    const msg=document.getElementById('mapMsg');
    if (pts.length){ const b=L.latLngBounds(pts); try{ map.fitBounds(b.pad(0.15)); }catch(_){} if(msg) msg.textContent=''; }
    else { if(msg) msg.textContent='Belum ada titik koordinat pada data kasus.'; }
  }

  function _syncTimeModeUI(){
    const mode = (document.getElementById('fTimeMode')?.value)||'month';
    const m = document.getElementById('monthRangeWrap');
    const y = document.getElementById('yearRangeWrap');
    if (mode === 'month'){ m?.classList.remove('inactive'); y?.classList.add('inactive'); }
    else { y?.classList.remove('inactive'); m?.classList.add('inactive'); }
  }

  function refreshAll(){ buildFilterOptions(); updateDefBadge(); updateOnsetTag(); updateOnsetVisibility(); refreshCharts(); drawChoropleth(); initMap(); drawMarkers(); }

  function wire(){
    document.getElementById('simpan')?.addEventListener('click', (e)=>{ e.preventDefault(); handleSubmit(); });
    document.getElementById('applyFilter')?.addEventListener('click', (e)=>{ e.preventDefault(); applyFilters(); });
    document.getElementById('recalcMap')?.addEventListener('click', (e)=>{ e.preventDefault(); drawMarkers(); });
    document.getElementById('fTimeMode')?.addEventListener('change', _syncTimeModeUI);
    
    // bind lab radios for instant definisi
    ;['pcr','lab_pcr','mat','lab_mat','rdt','lab_rdt'].forEach(name=>{
      document.querySelectorAll(`input[name="${name}"]`).forEach(el=>{
        el.addEventListener('change', ()=>{ updateDefBadge(); });
      });
    });
    ['input','change'].forEach(evt => {
      document.addEventListener(evt, (e)=>{
        const id = (e.target && e.target.id) || '';
        if (id.startsWith('g_') || id.startsWith('p_') || ['onsetManual'].includes(id)) onAnyInputChanged();
      }, true);
    });
  }

  
  // ===== Choropleth Map (Provinsi) =====
  let map, provLayer, legendCtrl, compassCtrl;
  const RAW_PROV_URL = 'https://raw.githubusercontent.com/agustddiction/Dashboard-Leptospirosis/main/provinsi.json';

  function getCasesByProv(){
    const data = computeFiltered();
    const agg = {};
    data.forEach(it => {
      const p = (it.provinsi||it.prov||'').trim();
      if(!p) return;
      agg[p] = (agg[p]||0)+1;
    });
    return agg;
  }
  function colorScale(v, max){
    const t = max ? (v/max) : 0;
    const stops = ['#ffffff','#e0f2f1','#b2dfdb','#80cbc4','#26a69a','#00897b'];
    const idx = Math.min(5, Math.floor(t*5));
    return stops[idx];
  }
  function buildLegend(max){
    const div = L.DomUtil.create('div','leaflet-legend');
    div.innerHTML = '<div><b>Kasus / Provinsi</b></div>';
    const scale = L.DomUtil.create('div','scale', div);
    [0,1,2,3,4,5].forEach(i=>{
      const box = L.DomUtil.create('div','box', scale);
      box.style.background = colorScale(i,5);
    });
    const lbl = L.DomUtil.create('div','muted', div);
    lbl.innerHTML = '<span>rendah</span> &nbsp;&nbsp; <span style="float:right">tinggi</span>';
    return div;
  }
  function makeCompass(){
    return L.Control.extend({
      onAdd: function(){
        const div = L.DomUtil.create('div','leaflet-control compass');
        div.innerHTML = 'N ↑';
        return div;
      },
      onRemove: function(){}
    });
  }
  async function loadProvGeo(){
    try{
      const r = await fetch(RAW_PROV_URL, {cache:'no-store'});
      if (!r.ok) throw new Error('fetch failed');
      return await r.json();
    }catch(e){
      console.warn('Prov geo load failed', e);
      return null;
    }
  }
  async function initMap(){
    const mapDiv = document.getElementById('map'); if (!mapDiv) return;
    if (!map){
      map = L.map(mapDiv, { zoomControl: true, preferCanvas: true }).setView([-2.5,118], 4);
      L.tileLayer('', { attribution:'' }).addTo(map);
      const C = makeCompass(); compassCtrl = new C({ position:'topright' }).addTo(map);
      legendCtrl = L.control({position:'bottomright'}); legendCtrl.onAdd = function(){ return buildLegend(5); }; legendCtrl.addTo(map);
    }
    if (!provLayer){
      const gj = await loadProvGeo();
      if (gj && gj.type){
        provLayer = L.geoJSON(gj, {
          style: f => ({ color:'#cbd5e1', weight:1, fillOpacity:.9, fillColor:'#fff' }),
          onEachFeature: (f, layer) => {
            const name = (f.properties?.Propinsi || f.properties?.provinsi || f.properties?.name || '').trim();
            layer.bindTooltip(name || 'Provinsi', {sticky:true});
          }
        }).addTo(map);
      }
    }
    drawChoropleth();
  }
  function drawChoropleth(){
    if (!map || !provLayer) return;
    const agg = getCasesByProv();
    const max = Math.max(1, ...Object.values(agg).map(x=>x||0));
    provLayer.eachLayer(layer => {
      const name = (layer.feature?.properties?.Propinsi || layer.feature?.properties?.provinsi || layer.feature?.properties?.name || '').trim();
      const v = agg[name] || 0;
      layer.setStyle({ fillColor: colorScale(v, max) });
      const html = `<b>${name||'Provinsi'}</b><br>Kasus: ${v}`;
      layer.bindPopup(html);
    });
  }
  function exportMapPng(){
    if (!map) return alert('Peta belum siap');
    if (typeof leafletImage !== 'function') { alert('leaflet-image tidak tersedia'); return; }
    leafletImage(map, function(err, canvas){
      if (err || !canvas){ alert('Gagal render peta'); return; }
      const w = canvas.width, h = canvas.height;
      const out = document.createElement('canvas'); out.width = w; out.height = h;
      const ctx = out.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h); ctx.drawImage(canvas, 0, 0);
      const link = document.createElement('a'); link.download = 'peta-leptospirosis.png'; link.href = out.toDataURL('image/png'); link.click();
    });
  }

  function boot(){ renderGejalaPaparan(); wire(); refreshAll(); _syncTimeModeUI(); updateOnsetVisibility(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.renderTable=function(){}; window.renderCounts=function(){}; window.updateCharts=refreshCharts; window.recalcCasesFromLocalAndRefresh=refreshAll; window.initMap=initMap; window.scheduleAutoPull=function(){};
})();
