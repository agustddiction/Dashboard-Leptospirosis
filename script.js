
// =====================
// KONFIGURASI
// =====================
const ACCESS_TOKEN = 'ZOOLEPTO123';
const DEFAULT_GH = 'https://raw.githubusercontent.com/agustddiction/Dashboard-Leptospirosis/main/provinsi.json';
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxFHgRel9-LTQTc0YIjy5G22BWk1RiqUjjDqCd8XE1Q4tF8h4t5r8X9WL-MwVZ2IyyYHg/exec';

// =====================
// TOKEN GATE
// =====================
let unlocked = false;
function showLock(){ const lock=document.getElementById('lock'); if(lock){ lock.classList.remove('hidden'); document.body.classList.add('locked'); setTimeout(()=>document.getElementById('tokenInput')?.focus(),50);} }
function afterUnlock(){
  unlocked = true;
  hideLock();
  // Pastikan map & chart terlihat setelah overlay hilang
  setTimeout(()=>{
    initMap();
    try{ trendChart?.resize(); kabChart?.resize(); }catch(_){}
    setTimeout(()=>{ if(window._leaf_map) { window._leaf_map.invalidateSize(); try{ fitIndonesia(); }catch(_){}} }, 200);
  }, 100);
}
function hideLock(){ const lock=document.getElementById('lock'); if(lock){ lock.remove(); document.body.classList.remove('locked'); } }
function verifyToken(){
  const val=(document.getElementById('tokenInput')?.value||'').trim();
  const err=document.getElementById('lockErr');
  if(val===ACCESS_TOKEN){ localStorage.setItem('lepto_token_ok','1'); afterUnlock(); } else { if(err){err.textContent='Token salah. Coba lagi.'; err.style.display='block';} }
}
function autoUnlockFromURL(){ try{ const t=new URLSearchParams(location.search).get('token'); if(t===ACCESS_TOKEN){ localStorage.setItem('lepto_token_ok','1'); afterUnlock(); } }catch(e){} }
(function(){
  const sp = new URLSearchParams(location.search);
  const force = sp.get('forceToken')==='1';
  const okStored = localStorage.getItem('lepto_token_ok')==='1';
  const ok = (!force) && okStored;
  if(!ok) showLock(); else afterUnlock();
  document.getElementById('unlockBtn')?.addEventListener('click', verifyToken);
  document.addEventListener('keydown', e=>{ const lock=document.getElementById('lock'); if(lock && !lock.classList.contains('hidden') && e.key==='Enter') verifyToken(); });
  autoUnlockFromURL();
  document.getElementById('forceLogin')?.addEventListener('click', ()=>{
    try{ localStorage.removeItem('lepto_token_ok'); }catch(_){}
    showLock();
  });

})();

// =====================
// DATA MASTER PROV-KAB
// =====================
let PROV_KAB={};
fetch('data/kabkota.json').then(r=>r.json()).then(j=>{ PROV_KAB=j; initProvKab(); }).catch(()=>{ PROV_KAB={"Aceh":["Kabupaten Aceh Besar"]}; initProvKab(); });

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
];

const prov=document.getElementById('prov'); const kab=document.getElementById('kab');
const fProv=document.getElementById('fProv'); const fKab=document.getElementById('fKab');
const fStart=document.getElementById('fStart'); const fEnd=document.getElementById('fEnd');
const fTimeMode=document.getElementById('fTimeMode'); const fYearStart=document.getElementById('fYearStart'); const fYearEnd=document.getElementById('fYearEnd');
const trendTitle=document.getElementById('trendTitle');

function initProvKab(){
  const provs=Object.keys(PROV_KAB).sort();
  const addOpts=(sel,items,withAll=false)=>{ sel.innerHTML=""; if(withAll) sel.append(new Option("Semua","")); sel.append(new Option("Pilih...","")); items.forEach(x=>sel.append(new Option(x,x))); };
  addOpts(prov,provs,false); addOpts(fProv,provs,true);
  const updateKab=(selKab,provName,withAll=false)=>{
    selKab.innerHTML=""; if(withAll) selKab.append(new Option("Semua",""));
    if(!provName||!PROV_KAB[provName]){ selKab.append(new Option("Pilih provinsi dulu","")); return; }
    PROV_KAB[provName].forEach(x=>selKab.append(new Option(x,x)));
  };
  prov.addEventListener('change', ()=>updateKab(kab,prov.value,false));
  fProv.addEventListener('change', ()=>updateKab(fKab,fProv.value,true));
  updateKab(kab,prov.value,false); updateKab(fKab,fProv.value,true);
}

// =====================
// RIWAYAT GEJALA
// =====================
function initGejalaChecklist(){
  const grid=document.getElementById('gejalaGrid');
  grid.innerHTML='';
  const today=new Date().toISOString().slice(0,10);
  GEJALA.forEach(g=>{
    const wrap=document.createElement('div');
    wrap.className="symptom";
    wrap.innerHTML=`
      <input type="checkbox" id="g_${g.id}" data-symptom="${g.id}">
      <label for="g_${g.id}" style="margin:0;font-weight:500">${g.label}</label>
      <input type="date" id="d_${g.id}" style="display:none" max="${today}">
    `;
    grid.appendChild(wrap);
    const cb=wrap.querySelector('input[type=checkbox]');
    const dt=wrap.querySelector('input[type=date]');
    const toggle=()=>{ dt.style.display = cb.checked ? '' : 'none'; dt.required = cb.checked; if(cb.checked && !dt.value) dt.value=today; updateOnset(); updateDefinisiBadge(); toggleManualOnset(); };
    cb.addEventListener('change', toggle);
    dt.addEventListener('change', ()=>{ updateOnset(); updateDefinisiBadge(); });
  });
}
initGejalaChecklist();
try{ toggleManualOnset(); }catch(_){}
function gejalaCheckedCount(){
  let c=0;
  GEJALA.forEach(g=>{
    const cb=document.getElementById('g_'+g.id);
    if(cb && cb.checked) c++;
  });
  return c;
}
function toggleManualOnset(){
  const wrap=document.getElementById('manualOnsetWrap');
  if(!wrap) return;
  const show = gejalaCheckedCount()===0;
  wrap.classList.toggle('hidden', !show);
}
function getManualOnsetDate(){
  const el=document.getElementById('onsetManual');
  if(el && el.value){ try{ return new Date(el.value);}catch(_){ return null; } }
  return null;
}


// =====================
// PAPARAN
// =====================
function initPaparanChecklist(){
  const grid=document.getElementById('paparanGrid'); grid.innerHTML='';
  PAPARAN.forEach((p,idx)=>{
    const wrap=document.createElement('div'); wrap.className="symptom";
    const id='p_'+idx;
    wrap.innerHTML=`<input type="checkbox" id="${id}"><label for="${id}" style="margin:0;font-weight:500">${p}</label>`;
    grid.appendChild(wrap);
    wrap.querySelector('input[type=checkbox]').addEventListener('change', updateDefinisiBadge);
  });
}
initPaparanChecklist();

// =====================
// ONSET & DEFINISI KASUS
// =====================
function getOnsetDate(){
  let earliest=null;
  GEJALA.forEach(g=>{
    const cb=document.getElementById('g_'+g.id);
    const dt=document.getElementById('d_'+g.id);
    if(cb && cb.checked && dt && dt.value){
      const d=new Date(dt.value);
      if(!earliest || d<earliest) earliest=d;
    }
  });
  if(!earliest){
    const m=getManualOnsetDate();
    if(m) earliest=m;
  }
  return earliest;
}
function updateOnset(){ const onset=getOnsetDate(); document.getElementById('onsetTag').textContent = onset ? onset.toISOString().slice(0,10) : "—"; }

function getRadio(name){ return (document.querySelector('input[name="'+name+'"]:checked')?.value)||''; }
function computeDefinisi(){
  const S={}; GEJALA.forEach(g=>{ S[g.id]=document.getElementById('g_'+g.id)?.checked; });
  const anyExposure = PAPARAN.some((_,idx)=> document.getElementById('p_'+idx)?.checked );
  const leuk=parseFloat(document.getElementById('leukosit').value);
  const trom=parseFloat(document.getElementById('trombosit').value);
  const bili=parseFloat(document.getElementById('bilirubin').value);
  const amil=parseFloat(document.getElementById('amilase').value);
  const cpk =parseFloat(document.getElementById('cpk').value);
  const proteinuria=document.getElementById('proteinuria').checked;
  const hematuria=document.getElementById('hematuria').checked;
  const rdt=getRadio('rdt'), mat=getRadio('mat'), pcr=getRadio('pcr');
  const hasFever=!!S.demam; const supportMinor=(S.mialgia||S.malaise||S.conj); const suspek=hasFever&&supportMinor&&anyExposure;
  const severeList=[S.nyeriBetis,S.jaundice,S.anuria,S.perdarahan,S.sesak,S.aritmia,S.batuk,S.ruam];
  const severeCount=severeList.filter(Boolean).length;
  const crit1=suspek && severeCount>=2;
  const crit2=(rdt==='pos');
  const labA=(!isNaN(trom)&&trom<100);
  const labB=(!isNaN(leuk)&&(leuk<3.5||leuk>10.5));
  const labC=((!isNaN(bili)&&bili>2)||(!isNaN(amil)&&amil>110)||(!isNaN(cpk)&&cpk>200));
  const labD=(proteinuria||hematuria);
  const labCount=[labA,labB,labC,labD].filter(Boolean).length;
  const crit3=suspek && labCount>=3;
  const probable=(crit1||crit2||crit3);
  const confirmed=((suspek||probable)&&(mat==='pos'||pcr==='pos'));
  let def="Tidak memenuhi"; if(confirmed) def="Confirm"; else if(probable) def="Probable"; else if(suspek) def="Suspek"; return def;
}
function updateDefinisiBadge(){
  const def=computeDefinisi(); const badge=document.getElementById('defBadge');
  badge.textContent="Definisi Kasus: "+def; badge.className='badge';
  if(def==='Confirm') badge.classList.add('ok');
  else if(def==='Probable') badge.classList.add('warn');
  else if(def==='Suspek') badge.classList.add('neutral');
  else badge.classList.add('bad');
}
// Tandai abnormal
['leukosit','trombosit','bilirubin','sgot','sgpt','kreatinin','amilase','cpk'].forEach(id=>{
  const el=document.getElementById(id);
  el && el.addEventListener('input', ()=>{
    const v=parseFloat(el.value); let abn=false;
    switch(id){
      case 'leukosit': abn=!isNaN(v)&&(v<3.5||v>10.5); break;
      case 'trombosit': abn=!isNaN(v)&&(v<150||v>450); break;
      case 'bilirubin': abn=!isNaN(v)&&(v>1.2); break;
      case 'sgot': abn=!isNaN(v)&&(v>40); break;
      case 'sgpt': abn=!isNaN(v)&&(v>41); break;
      case 'kreatinin': abn=!isNaN(v)&&(v<0.6||v>1.3); break;
      case 'amilase': abn=!isNaN(v)&&(v>110); break;
      case 'cpk': abn=!isNaN(v)&&(v>200); break;
    }
    el.classList.toggle('abn', abn);
    updateDefinisiBadge();
  });
});

// =====================
// CRUD DATA
// =====================
function norm(s){ return (s||"").toString().trim().toLowerCase().replace(/\s+/g,' '); }
function getFormData(){
  const onsetDate=getOnsetDate();
  const gejala={}; const gejalaTgl={};
  GEJALA.forEach(g=>{ gejala[g.label]=document.getElementById('g_'+g.id).checked; gejalaTgl[g.label]=(document.getElementById('d_'+g.id).value||""); });
  const paparan=PAPARAN.map((p,idx)=>({label:p,checked:document.getElementById('p_'+idx).checked}));
  return {
    nama:document.getElementById('nama').value,
    jk:document.getElementById('jk').value,
    umur:document.getElementById('umur').value,
    kerja:document.getElementById('kerja').value,
    prov:document.getElementById('prov').value,
    kab:document.getElementById('kab').value,
    alamat:document.getElementById('alamat').value,
    gejala, gejalaTgl,
    onset: onsetDate ? onsetDate.toISOString().slice(0,10) : "",
    tglPaparan:document.getElementById('tglPaparan').value,
    paparan,
    lab:{
      leukosit:document.getElementById('leukosit').value,
      trombosit:document.getElementById('trombosit').value,
      bilirubin:document.getElementById('bilirubin').value,
      sgot:document.getElementById('sgot').value,
      sgpt:document.getElementById('sgpt').value,
      kreatinin:document.getElementById('kreatinin').value,
      rdt:getRadio('rdt'),
      mat:getRadio('mat'),
      serovar:document.getElementById('serovar').value,
      amilase:document.getElementById('amilase').value,
      cpk:document.getElementById('cpk').value,
      proteinuria:document.getElementById('proteinuria').checked,
      hematuria:document.getElementById('hematuria').checked,
      pcr:getRadio('pcr'),
    },
    statusAkhir:document.getElementById('statusAkhir').value,
    tglStatus:document.getElementById('tglStatus').value,
    obat:document.getElementById('obat').value,
    definisi:computeDefinisi(),
    savedAt:new Date().toISOString()
  };
}
function resetForm(){
  document.querySelectorAll('input,select,textarea').forEach(el=>{ if(el.type==='checkbox'||el.type==='radio') el.checked=false; else el.value=''; });
  initProvKab(); initGejalaChecklist();
try{ toggleManualOnset(); }catch(_){}
function gejalaCheckedCount(){
  let c=0;
  GEJALA.forEach(g=>{
    const cb=document.getElementById('g_'+g.id);
    if(cb && cb.checked) c++;
  });
  return c;
}
function toggleManualOnset(){
  const wrap=document.getElementById('manualOnsetWrap');
  if(!wrap) return;
  const show = gejalaCheckedCount()===0;
  wrap.classList.toggle('hidden', !show);
}
function getManualOnsetDate(){
  const el=document.getElementById('onsetManual');
  if(el && el.value){ try{ return new Date(el.value);}catch(_){ return null; } }
  return null;
}
 initPaparanChecklist();
  updateOnset(); updateDefinisiBadge();
}
document.getElementById('reset').addEventListener('click', e=>{ e.preventDefault(); resetForm(); });

function loadCases(){ try{return JSON.parse(localStorage.getItem('lepto_cases')||'[]');}catch(e){return[]} }
function saveCases(arr){ localStorage.setItem('lepto_cases', JSON.stringify(arr)); }

function renderCounts(){
  const data=loadCases(); const counts={Suspek:0,Probable:0,Confirm:0,Other:0};
  data.forEach(d=>{ if(d.definisi==='Suspek') counts.Suspek++; else if(d.definisi==='Probable') counts.Probable++; else if(d.definisi==='Confirm') counts.Confirm++; else counts.Other++; });
  const box=document.getElementById('counts'); box.innerHTML='';
  Object.entries(counts).forEach(([k,v])=>{ const span=document.createElement('span'); const cls=k==='Confirm'?'ok':(k==='Probable'?'warn':(k==='Suspek'?'':'bad')); span.className='tag '+cls; span.textContent=`${k}: ${v}`; box.appendChild(span); });
}
function defClass(def){ if(def==='Confirm') return 'ok'; if(def==='Probable') return 'warn'; if(def==='Suspek') return ''; return 'bad'; }
function renderTable(){
  const tbody=document.querySelector('#casesTable tbody'); tbody.innerHTML='';
  const data=loadCases();
  data.forEach((d,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${d.nama}</td><td>${d.umur}</td><td>${d.prov}</td><td>${d.kab}</td>
      <td>${d.onset||'-'}</td><td><span class="tag ${defClass(d.definisi)}">${d.definisi}</span></td>
      <td>${d.statusAkhir||'-'}</td><td><button class="btn small" data-del="${i}">Hapus</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const i=+btn.dataset.del; const arr=loadCases(); arr.splice(i,1); saveCases(arr); renderTable(); renderCounts(); updateCharts(); recalcCasesFromLocalAndRefresh(); });
  });
}
document.getElementById('simpan').addEventListener('click', e=>{
  e.preventDefault();
  const data=getFormData();
  if(!data.nama){ alert('Nama wajib diisi.'); return; }
  if(!data.prov||!data.kab){ alert('Provinsi dan Kabupaten/Kota wajib dipilih.'); return; }
  const arr=loadCases(); arr.push(data); saveCases(arr);
  renderTable(); renderCounts(); updateCharts(); recalcCasesFromLocalAndRefresh();
  if(typeof sendRowToSheets==='function'){ try{ sendRowToSheets(flattenCase(data)); }catch(_e){} }
  alert('Kasus disimpan.');
});
function duplicateKey(d){ return [norm(d.nama),norm(d.umur),norm(d.alamat),d.onset||''].join('|'); }
document.getElementById('cekDup').addEventListener('click', ()=>{
  const arr=loadCases(); const seen={}; const dups=new Set();
  arr.forEach((d,i)=>{ const k=duplicateKey(d); if(seen[k]!==undefined){ dups.add(i); dups.add(seen[k]); } else { seen[k]=i; } });
  const rows=document.querySelectorAll('#casesTable tbody tr');
  rows.forEach((tr,i)=>tr.classList.toggle('dup', dups.has(i)));
  alert(duplikat.size?'Duplikat ditemukan & ditandai warna krem.':'Tidak ada duplikat.');
});
document.getElementById('hapusDup').addEventListener('click', ()=>{
  const arr=loadCases(); const seen={}; const result=[];
  arr.forEach(d=>{ const k=duplicateKey(d); if(!(k in seen)){ seen[k]=true; result.push(d); } });
  const removed=arr.length-result.length; saveCases(result);
  renderTable(); renderCounts(); updateCharts(); recalcCasesFromLocalAndRefresh();
  alert(removed>0?('Menghapus '+removed+' duplikat.'):'Tidak ada duplikat untuk dihapus.');
});

// =====================
// CHARTS (Bulan/Tahun + filter prov/kab + fallback tanggal)
// =====================
let trendChart, kabChart;
function ensureCharts(){
  const ctx1=document.getElementById('trendChart').getContext('2d');
  const ctx2=document.getElementById('kabChart').getContext('2d');
  if(!trendChart){ trendChart=new Chart(ctx1,{type:'line',data:{labels:[],datasets:[{label:'Kasus',data:[]}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}}); }
  if(!kabChart){ kabChart=new Chart(ctx2,{type:'bar',data:{labels:[],datasets:[{label:'Kasus',data:[]}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}}); }
}
ensureCharts();
function getDateForAgg(d){ return d.onset || d.tglStatus || (d.savedAt ? d.savedAt.slice(0,10) : ''); }
function monthKey(dateStr){ return dateStr ? dateStr.slice(0,7) : ''; }
function yearKey(dateStr){ return dateStr ? dateStr.slice(0,4) : ''; }
function withinRangeMonth(dateStr,start,end){ const m=monthKey(dateStr); if(!m) return false; if(start&&m<start) return false; if(end&&m>end) return false; return true; }
function withinRangeYear(dateStr,ys,ye){ const y=yearKey(dateStr); if(!y) return false; if(ys&&y<ys) return false; if(ye&&y>ye) return false; return true; }
function updateCharts(){
  const arr=loadCases();
  const fp=fProv.value||""; const fk=fKab.value||"";
  const mode=fTimeMode.value||'month';
  const ms=fStart.value||""; const me=fEnd.value||"";
  const ys=(document.getElementById('fYearStart').value||''); const ye=(document.getElementById('fYearEnd').value||'');
  const filtered=arr.filter(d=>{
    if(fp&&d.prov!==fp) return false;
    if(fk&&d.kab!==fk) return false;
    const ds=getDateForAgg(d);
    return (mode==='month') ? withinRangeMonth(ds,ms,me) : withinRangeYear(ds,ys,ye);
  });
  // Trend
  const agg={};
  filtered.forEach(d=>{
    const ds=getDateForAgg(d); const key=(mode==='month')? monthKey(ds) : yearKey(ds);
    if(!key) return; agg[key]=(agg[key]||0)+1;
  });
  const keys=Object.keys(agg).sort();
  trendChart.data.labels=keys;
  trendChart.data.datasets[0].data=keys.map(k=>agg[k]||0);
  trendChart.update();
  trendTitle.textContent = (mode==='month') ? 'Tren kasus per bulan' : 'Tren kasus per tahun';

  // Per kab/kota
  const perKab={};
  filtered.forEach(d=>{ const kk=d.kab||'(Tidak diisi)'; perKab[kk]=(perKab[kk]||0)+1; });
  const kLabels=Object.keys(perKab).sort();
  kabChart.data.labels=kLabels;
  kabChart.data.datasets[0].data=kLabels.map(k=>perKab[k]||0);
  kabChart.update();
}
document.getElementById('applyFilter').addEventListener('click', updateCharts);

// =====================
// PETA CHOROPLETH
// =====================
function getColor(val){ const v=Number(val)||0; if(v===0) return '#ffffff'; if(v>0&&v<=50) return '#ffc4c4'; if(v>50&&v<=200) return '#ff7a7a'; return '#cc0000'; }
let geojsonLayer; let _labels=[]; window._leaf_map = null;
function ensureMap(){ if(window._leaf_map) return window._leaf_map; window._leaf_map=L.map('map',{zoomControl:true,attributionControl:false}); window.addEventListener('resize', ()=>{ try{ window._leaf_map.invalidateSize(); }catch(_){}}); return window._leaf_map; }
let casesByProvince={"Aceh":12,"Sumatera Utara":28,"Sumatera Barat":8,"Riau":15,"Jambi":5,"Sumatera Selatan":31,"Bengkulu":2,"Lampung":44,"Kepulauan Bangka Belitung":1,"Kepulauan Riau":3,"DKI Jakarta":320,"Jawa Barat":188,"Jawa Tengah":96,"DI Yogyakarta":45,"Jawa Timur":210,"Banten":74,"Bali":12,"Nusa Tenggara Barat":9,"Nusa Tenggara Timur":20,"Kalimantan Barat":6,"Kalimantan Tengah":4,"Kalimantan Selatan":11,"Kalimantan Timur":7,"Kalimantan Utara":1,"Sulawesi Utara":5,"Sulawesi Tengah":6,"Sulawesi Selatan":130,"Sulawesi Tenggara":4,"Gorontalo":1,"Sulawesi Barat":2,"Maluku":1,"Maluku Utara":1,"Papua Barat":1,"Papua":2,"Papua Selatan":0,"Papua Tengah":0,"Papua Pegunungan":0};
function totalNational(){ return Object.values(casesByProvince).reduce((a,b)=>a+(+b||0),0); }
function getProvName(props){ return props?.provinsi||props?.Provinsi||props?.PROVINSI||props?.NAME_1||props?.Name||props?.WADMPR||props?.wadmpr||props?.WADMPRV||props?.nama||props?.name||''; }
function styleFeature(feat){ const prov=getProvName(feat.properties||{}); const val=+casesByProvince[prov]||0; return {weight:1,color:'#9ca3af',fillColor:getColor(val),fillOpacity:0.8}; }
function highlightFeature(e){ e.target.setStyle({weight:2,fillOpacity:0.9,color:'#6b7280'}); e.target.bringToFront?.(); }
function resetHighlight(e){ geojsonLayer && geojsonLayer.resetStyle(e.target); }
function onEachFeature(feature, layer){
  const prov=getProvName(feature.properties||{}); const val=+casesByProvince[prov]||0;
  if(prov && !(prov in casesByProvince)) console.warn('⚠️ Nama provinsi pada GeoJSON tidak cocok dengan key casesByProvince:', prov);
  const pct=totalNational()?((val/totalNational())*100).toFixed(1):'0.0';
  layer.bindTooltip(`${prov||'(tanpa nama)'}: ${val.toLocaleString('id-ID')} kasus`,{sticky:true});
  layer.on({mouseover:highlightFeature,mouseout:resetHighlight,click:()=>{ layer.bindPopup(`<b>${prov||'(tanpa nama)'}</b><br>Kasus: ${val.toLocaleString('id-ID')}<br>Kontribusi nasional: ${pct}%`).openPopup(); }});
}
function addCenterLabels(){
  if(!window._leaf_map||!geojsonLayer) return;
  _labels.forEach(l=>window._leaf_map.removeLayer(l)); _labels=[];
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
function exportPNG(){ if(!window._leaf_map){ alert('Peta belum dirender.'); return; } leafletImage(window._leaf_map,(err,canvas)=>{ if(err){ alert('Gagal membuat gambar: '+err); return; } const a=document.createElement('a'); a.download='choropleth.png'; a.href=canvas.toDataURL('image/png'); a.click(); }); }
function recalcCasesByProvinceFromLocal(){ const arr=loadCases(); const counts={}; arr.forEach(d=>{ const p=d.prov||'(Tidak diisi)'; counts[p]=(counts[p]||0)+1; }); return counts; }
function recalcCasesFromLocalAndRefresh(){ const counts=recalcCasesByProvinceFromLocal(); if(Object.keys(counts).length){ casesByProvince=counts; refreshChoropleth(); } }
document.getElementById('recalcMap')?.addEventListener('click', ()=>recalcCasesFromLocalAndRefresh());
document.getElementById('exportPng')?.addEventListener('click', exportPNG);
async function initMap(){
  if(!unlocked) return;
  ensureMap();
  try{
    const data=await loadFromUrl(DEFAULT_GH);
    renderChoropleth(data);
    recalcCasesFromLocalAndRefresh();
    document.getElementById('mapMsg').textContent = '';
  }catch(err){
    // pesan sudah di mapMsg
  }
}

// =====================
// AUTO UPDATE & START
// =====================
const _root=document.querySelector('main');
function _autoUpd(){ updateOnset(); updateDefinisiBadge(); toggleManualOnset(); }
_root.addEventListener('input', _autoUpd, true);
_root.addEventListener('change', _autoUpd, true);
updateOnset(); updateDefinisiBadge(); renderTable(); renderCounts(); updateCharts();

// =====================
// EKSPOR EXCEL
// =====================
function flattenCase(d){
  const row={ 'Nama':d.nama,'Jenis Kelamin':d.jk,'Umur':d.umur,'Pekerjaan':d.kerja,'Provinsi':d.prov,'Kab/Kota':d.kab,'Alamat':d.alamat,'Onset':d.onset,'Tanggal Paparan':d.tglPaparan,'Definisi':d.definisi,'Status Akhir':d.statusAkhir,'Tanggal Status':d.tglStatus,'Obat':d.obat,'Saved At':d.savedAt };
  GEJALA.forEach(g=>{ const label=g.label; row['Gejala: '+label]=d.gejala[label]?'Ya':''; row['Tgl '+label]=d.gejalaTgl[label]||''; });
  row['Paparan (2 minggu)']=(d.paparan||[]).filter(x=>x.checked).map(x=>x.label).join('; ');
  const Lb=d.lab||{}; row['Leukosit (x10^3/µL)']=Lb.leukosit||''; row['Trombosit (x10^3/µL)']=Lb.trombosit||'';
  row['Bilirubin (mg/dL)']=Lb.bilirubin||''; row['SGOT (U/L)']=Lb.sgot||''; row['SGPT (U/L)']=Lb.sgpt||''; row['Kreatinin (mg/dL)']=Lb.kreatinin||''; row['Amilase (U/L)']=Lb.amilase||''; row['CPK (U/L)']=Lb.cpk||'';
  row['Proteinuria']=Lb.proteinuria?'Ya':''; row['Hematuria']=Lb.hematuria?'Ya':'';
  const map3=v=>v==='pos'?'Positif':(v==='neg'?'Negatif':(v==='nd'?'Tidak diperiksa':''));
  row['RDT']=map3(Lb.rdt); row['MAT']=map3(Lb.mat); row['PCR']=map3(Lb.pcr); row['Serovar']=Lb.serovar||'';
  return row;
}
function exportToExcel(){ const arr=loadCases(); if(arr.length===0){ alert('Tidak ada data untuk diekspor.'); return; } const rows=arr.map(flattenCase); const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Kasus'); XLSX.writeFile(wb,'leptospirosis_cases.xlsx'); }
document.getElementById('exportExcel').addEventListener('click', exportToExcel);

// =====================
// GOOGLE SHEETS (no-cors agar tidak gagal CORS)
// =====================
async function sendRowToSheets(row){
  if(!SHEETS_URL){ console.warn('SHEETS_URL kosong'); return; }
  try{
    await fetch(SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: ACCESS_TOKEN, action: 'append', row })
    });
  }catch(e){ console.warn('Gagal kirim Sheets:', e); }
}
async function sendAllToSheets(){
  if(!SHEETS_URL){ alert('SHEETS_URL belum diisi.'); return; }
  const arr=loadCases(); if(!arr.length){ alert('Tidak ada data.'); return; }
  try{
    await fetch(SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: ACCESS_TOKEN, action: 'appendBatch', rows: arr.map(flattenCase) })
    });
    alert('Permintaan sync dikirim (no-cors). Cek Sheet Anda.');
  }catch(e){ alert('Gagal sync: '+e); }
}
document.getElementById('syncSheets')?.addEventListener('click', sendAllToSheets);
