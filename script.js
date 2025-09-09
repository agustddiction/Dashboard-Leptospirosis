
// =====================
// KONFIGURASI
// =====================
const ACCESS_TOKEN = 'ZOOLEPTO123';
const DEFAULT_GH = 'https://raw.githubusercontent.com/agustddiction/Dashboard-Leptospirosis/main/provinsi.json';
const SHEETS_URL = ''; // isi Web App URL jika ingin sync ke Google Sheets

// =====================
// TOKEN GATE
// =====================
function showLock(){ const lock=document.getElementById('lock'); if(lock){ lock.classList.remove('hidden'); document.body.classList.add('locked'); setTimeout(()=>document.getElementById('tokenInput')?.focus(),50);} }
function hideLock(){ const lock=document.getElementById('lock'); if(lock){ lock.remove(); document.body.classList.remove('locked'); } }
function verifyToken(){
  const val=(document.getElementById('tokenInput')?.value||'').trim();
  const err=document.getElementById('lockErr');
  if(val===ACCESS_TOKEN){ localStorage.setItem('lepto_token_ok','1'); hideLock(); } else { if(err){err.textContent='Token salah. Coba lagi.'; err.style.display='block';} }
}
function autoUnlockFromURL(){ try{ const t=new URLSearchParams(location.search).get('token'); if(t===ACCESS_TOKEN){ localStorage.setItem('lepto_token_ok','1'); hideLock(); } }catch(e){} }
(function(){ const ok=localStorage.getItem('lepto_token_ok')==='1'; if(!ok) showLock();
  document.getElementById('unlockBtn')?.addEventListener('click', verifyToken);
  document.addEventListener('keydown', e=>{ const lock=document.getElementById('lock'); if(lock && !lock.classList.contains('hidden') && e.key==='Enter') verifyToken(); });
  autoUnlockFromURL();
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

// DOM elemen filter/controls
const prov=document.getElementById('prov'); const kab=document.getElementById('kab');
const fProv=document.getElementById('fProv'); const fKab=document.getElementById('fKab');
const fStart=document.getElementById('fStart'); const fEnd=document.getElementById('fEnd');
const trendTypeSel=document.getElementById('trendType');
const trendGranSel=document.getElementById('trendGran');
const yearRange=document.getElementById('yearRange');
const yStart=document.getElementById('yStart');
const yEnd=document.getElementById('yEnd');
const kabTypeSel=document.getElementById('kabType');

function initProvKab(){
  const provs=Object.keys(PROV_KAB).sort();
  const addOpts=(sel,items,withAll=false)=>{ sel.innerHTML=""; if(withAll) sel.append(new Option("Semua","")); sel.append(new Option("Pilih...","")); items.forEach(x=>sel.append(new Option(x,x))); };
  addOpts(prov,provs,false); addOpts(fProv,provs,true);
  const updateKab=(selKab,provName,withAll=false)=>{ selKab.innerHTML=""; if(withAll) selKab.append(new Option("Semua","")); if(!provName||!PROV_KAB[provName]){ selKab.append(new Option("Pilih provinsi dulu","")); return; } PROV_KAB[provName].forEach(x=>selKab.append(new Option(x,x))); };
  prov.addEventListener('change', ()=>updateKab(kab,prov.value,false));
  fProv.addEventListener('change', ()=>{ updateKab(fKab,fProv.value,true); updateCharts(); });
  fKab.addEventListener('change', updateCharts);
  updateKab(kab,prov.value,false); updateKab(fKab,fProv.value,true);
}

// =====================
// GEJALA checklist (tanggal muncul saat dicentang)
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
    const toggle=()=>{ dt.style.display = cb.checked ? '' : 'none'; dt.required = cb.checked; if(cb.checked && !dt.value) dt.value=today; updateOnset(); updateDefinisiBadge(); };
    cb.addEventListener('change', toggle);
    dt.addEventListener('change', ()=>{ updateOnset(); updateDefinisiBadge(); });
  });
}
initGejalaChecklist();

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
// ONSET & DEFINISI
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

// =====================
// CRUD
// =====================
function norm(s){ return (s||"").toString().trim().toLowerCase().replace(/\s+/g,' '); }
function getRecordDate(d){ return d.onset || d.tglPaparan || (d.savedAt ? d.savedAt.slice(0,10) : ""); }
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
  initProvKab(); initGejalaChecklist(); initPaparanChecklist();
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
      <td>${getRecordDate(d)||'-'}</td><td><span class="tag ${defClass(d.definisi)}">${d.definisi}</span></td>
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
function duplicateKey(d){ return [norm(d.nama),norm(d.umur),norm(d.alamat),getRecordDate(d)||''].join('|'); }
document.getElementById('cekDup').addEventListener('click', ()=>{
  const arr=loadCases(); const seen={}; const dups=new Set();
  arr.forEach((d,i)=>{ const k=duplicateKey(d); if(seen[k]!==undefined){ dups.add(i); dups.add(seen[k]); } else { seen[k]=i; } });
  const rows=document.querySelectorAll('#casesTable tbody tr');
  rows.forEach((tr,i)=>tr.classList.toggle('dup', dups.has(i)));
  alert(dups.size?'Duplikat ditemukan & ditandai warna krem.':'Tidak ada duplikat.');
});
document.getElementById('hapusDup').addEventListener('click', ()=>{
  const arr=loadCases(); const seen={}; const result=[];
  arr.forEach(d=>{ const k=duplicateKey(d); if(!(k in seen)){ seen[k]=true; result.push(d); } });
  const removed=arr.length-result.length; saveCases(result);
  renderTable(); renderCounts(); updateCharts(); recalcCasesFromLocalAndRefresh();
  alert(removed>0?('Menghapus '+removed+' duplikat.'):'Tidak ada duplikat untuk dihapus.');
});

// =====================
// CHARTS — helpers
// =====================
let trendChart, kabChart;
function createTrendChart(type){
  const ctx=document.getElementById('trendChart').getContext('2d');
  if(trendChart){ trendChart.destroy(); }
  trendChart=new Chart(ctx,{type:type||'line',data:{labels:[],datasets:[{label:'Kasus',data:[]}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},scales:{y:{beginAtZero:true}}}});
}
function createKabChart(type){
  const ctx=document.getElementById('kabChart').getContext('2d');
  if(kabChart){ kabChart.destroy(); }
  kabChart=new Chart(ctx,{type:type||'bar',data:{labels:[],datasets:[{label:'Kasus',data:[]}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
}
createTrendChart(trendTypeSel.value);
createKabChart(kabTypeSel.value);

function monthKey(dateStr){ return dateStr.slice(0,7); } // YYYY-MM
function yearKey(dateStr){ return dateStr.slice(0,4); }
function addMonths(ym, delta){ // ym 'YYYY-MM'
  const [y,m]=ym.split('-').map(Number); const d=new Date(y, m-1+delta, 1);
  return d.toISOString().slice(0,7);
}
function generateMonthRange(startYM, endYM){
  if(!startYM || !endYM) return [];
  let cur=startYM; const arr=[];
  while(cur<=endYM){ arr.push(cur); cur=addMonths(cur,1); }
  return arr;
}
function generateYearRange(startY, endY){
  if(!startY || !endY) return [];
  const s=+startY, e=+endY; const arr=[];
  for(let y=s; y<=e; y++){ arr.push(String(y)); }
  return arr;
}
// auto defaults for month range based on data
function inferMonthRange(data){
  let min=null, max=null;
  data.forEach(d=>{
    const dt=getRecordDate(d); if(!dt) return;
    const m=monthKey(dt);
    if(!min || m<min) min=m;
    if(!max || m>max) max=m;
  });
  return [min,max];
}
function inferYearRange(data){
  let min=null, max=null;
  data.forEach(d=>{
    const dt=getRecordDate(d); if(!dt) return;
    const y=yearKey(dt);
    if(!min || y<min) min=y;
    if(!max || y>max) max=y;
  });
  return [min,max];
}

// =====================
// UPDATE CHARTS (tren + kab/kota)
// =====================
function updateCharts(){
  const arr=loadCases();
  // Filter prov/kab
  const selProv=fProv.value||"";
  const selKab=fKab.value||"";
  let filtered=arr.filter(d=>{
    if(selProv && d.prov!==selProv) return false;
    if(selKab && d.kab!==selKab) return false;
    return true;
  });

  // === Trend aggregation ===
  const gran=trendGranSel.value; // 'month' | 'year'
  let labels=[], series=[];

  if(gran==='month'){
    // Determine month range (use inputs or infer from data)
    let start=fStart.value, end=fEnd.value;
    if(!start || !end){
      const [infS, infE]=inferMonthRange(filtered.length?filtered:arr);
      start = start || infS;
      end   = end   || infE;
      // also set UI once if empty
      if(!fStart.value && start) fStart.value = start;
      if(!fEnd.value   && end)   fEnd.value   = end;
    }
    labels = generateMonthRange(start, end);
    const perMonth={}; filtered.forEach(d=>{ const dt=getRecordDate(d); if(!dt) return; const k=monthKey(dt); perMonth[k]=(perMonth[k]||0)+1; });
    series = labels.map(k=>perMonth[k]||0);
  }else{ // year
    let ys=yStart.value, ye=yEnd.value;
    if(!ys || !ye){
      const [infS, infE]=inferYearRange(filtered.length?filtered:arr);
      ys = ys || infS; ye = ye || infE;
      if(!yStart.value && ys) yStart.value = ys;
      if(!yEnd.value   && ye) yEnd.value   = ye;
    }
    labels = generateYearRange(ys, ye);
    const perYear={}; filtered.forEach(d=>{ const dt=getRecordDate(d); if(!dt) return; const k=yearKey(dt); perYear[k]=(perYear[k]||0)+1; });
    series = labels.map(k=>perYear[k]||0);
  }

  // Re-create trend chart if type changed
  const wantType = trendTypeSel.value;
  if(!trendChart || trendChart.config.type!==wantType){ createTrendChart(wantType); }
  trendChart.data.labels = labels;
  trendChart.data.datasets[0].data = series;
  trendChart.update();

  // === Kab/Kota chart ===
  const perKab={};
  filtered.forEach(d=>{
    const kk=d.kab || '(Tidak diisi)';
    const dt=getRecordDate(d);
    // respect time filters when month granularity selected
    if(gran==='month' && fStart.value && fEnd.value && dt){
      const mk=monthKey(dt);
      if(mk < fStart.value || mk > fEnd.value) return;
    }
    if(gran==='year' && (yStart.value || yEnd.value) && dt){
      const yk=yearKey(dt);
      if(yStart.value && yk < yStart.value) return;
      if(yEnd.value && yk > yEnd.value) return;
    }
    perKab[kk]=(perKab[kk]||0)+1;
  });
  let kabLabels=Object.keys(perKab);
  // If no province selected, show top 10 kab/kota overall
  if(!selProv){
    kabLabels = kabLabels.sort((a,b)=>perKab[b]-perKab[a]).slice(0,10);
  }else{
    kabLabels = kabLabels.sort();
  }
  const kabSeries = kabLabels.map(k=>perKab[k]||0);
  const wantKabType = kabTypeSel.value;
  if(!kabChart || kabChart.config.type!==wantKabType){ createKabChart(wantKabType); }
  kabChart.data.labels = kabLabels;
  kabChart.data.datasets[0].data = kabSeries;
  kabChart.update();
}

// listeners for controls
document.getElementById('applyFilter').addEventListener('click', updateCharts);
trendTypeSel.addEventListener('change', updateCharts);
kabTypeSel.addEventListener('change', updateCharts);
trendGranSel.addEventListener('change', () => {
  const byYear = trendGranSel.value==='year';
  yearRange.style.display = byYear ? '' : 'none';
  // no forced clearing; keep inputs if user set them
  updateCharts();
});
[fStart,fEnd,yStart,yEnd].forEach(el=> el.addEventListener('change', updateCharts));

// =====================
// PETA CHOROPLETH (sama seperti sebelumnya)
// =====================
function getColor(val){ const v=Number(val)||0; if(v===0) return '#ffffff'; if(v>0&&v<=50) return '#ffc4c4'; if(v>50&&v<=200) return '#ff7a7a'; return '#cc0000'; }
let map, geojsonLayer; let _labels=[];
function ensureMap(){ if(map) return map; map=L.map('map',{zoomControl:true,attributionControl:false}); return map; }
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
  if(!map||!geojsonLayer) return;
  _labels.forEach(l=>map.removeLayer(l)); _labels=[];
  geojsonLayer.eachLayer(layer=>{
    const prov=getProvName(layer.feature?.properties||{}); const val=+casesByProvince[prov]||0;
    if(val>0){ const c=layer.getBounds().getCenter(); const t=L.tooltip({permanent:true,direction:'center',className:'prov-label'}).setContent(String(val)).setLatLng(c); _labels.push(t); t.addTo(map); }
  });
}
const legend=L.control({position:'topright'});
legend.onAdd=function(){ const div=L.DomUtil.create('div','legend'); div.innerHTML='<div class="legend-title">Kategori Kasus</div>'+'<div class="legend-row"><span class="swatch" style="background:#ffffff"></span>0</div>'+'<div class="legend-row"><span class="swatch" style="background:#ffc4c4"></span>1–50</div>'+'<div class="legend-row"><span class="swatch" style="background:#ff7a7a"></span>50–200</div>'+'<div class="legend-row"><span class="swatch" style="background:#cc0000"></span>&gt;200</div>'; return div; };
function refreshChoropleth(){ geojsonLayer && geojsonLayer.setStyle(styleFeature); addCenterLabels(); }
async function loadFromUrl(url){ const res=await fetch(url,{mode:'cors'}); if(!res.ok) throw new Error('Gagal fetch GeoJSON: '+res.status); return await res.json(); }
function renderChoropleth(geojson){ ensureMap(); if(geojsonLayer) map.removeLayer(geojsonLayer); geojsonLayer=L.geoJSON(geojson,{style:styleFeature,onEachFeature:onEachFeature}).addTo(map); try{ map.fitBounds(geojsonLayer.getBounds(),{padding:[10,10]}); }catch(_){} if(!legend._map) legend.addTo(map); addCenterLabels(); }
function exportPNG(){ if(!map){ alert('Peta belum dirender.'); return; } leafletImage(map,(err,canvas)=>{ if(err){ alert('Gagal membuat gambar: '+err); return; } const a=document.createElement('a'); a.download='choropleth.png'; a.href=canvas.toDataURL('image/png'); a.click(); }); }
function recalcCasesByProvinceFromLocal(){ const arr=loadCases(); const counts={}; arr.forEach(d=>{ const p=d.prov||'(Tidak diisi)'; counts[p]=(counts[p]||0)+1; }); return counts; }
function recalcCasesFromLocalAndRefresh(){ const counts=recalcCasesByProvinceFromLocal(); if(Object.keys(counts).length){ casesByProvince=counts; refreshChoropleth(); } }
document.getElementById('recalcMap')?.addEventListener('click', ()=>recalcCasesFromLocalAndRefresh());
document.getElementById('exportPng')?.addEventListener('click', exportPNG);
(async function initMap(){ ensureMap(); try{ const data=await loadFromUrl(DEFAULT_GH); renderChoropleth(data); recalcCasesFromLocalAndRefresh(); }catch(err){ console.warn('Auto-load GeoJSON gagal:',err); } })();

// =====================
// AUTO UPDATE + INIT
// =====================
const _root=document.querySelector('main');
function _autoUpd(){ updateOnset(); updateDefinisiBadge(); updateCharts(); }
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
// GOOGLE SHEETS (opsional, no-cors)
// =====================
async function sendRowToSheets(row){
  if(!SHEETS_URL){ console.warn('SHEETS_URL kosong'); return; }
  try{
    await fetch(SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
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
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: ACCESS_TOKEN, action: 'appendBatch', rows: arr.map(flattenCase) })
    });
    alert('Permintaan sync telah dikirim (mode no-cors). Cek Sheet Anda.');
  }catch(e){ alert('Gagal sync: '+e); }
}
document.getElementById('syncSheets')?.addEventListener('click', sendAllToSheets);
