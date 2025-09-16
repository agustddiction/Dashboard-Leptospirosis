// =====================
// KONFIGURASI
// =====================
const ACCESS_TOKEN = 'ZOOLEPTO123';
const DEFAULT_GH = 'https://raw.githubusercontent.com/agustddiction/Dashboard-Leptospirosis/main/provinsi.json';
// Google Sheets WRITE (Apps Script /exec)
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxFHgRel9-LTQTc0YIjy5G22BWk1RiqUjjDqCd8XE1Q4tF8h4t5r8X9WL-MwVZ2IyyYHg/exec'; // isi URL Web App /exec
// Google Sheets READ (GViz JSON)
const SPREADSHEET_ID = '1rcySn3UNzsEHCd7t7ld4f-pSBUTrbNDBDgvxjbLcRm4';
const SHEET_NAME = 'Kasus';
const SHEETS_READ_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json`;
const AUTO_PULL = true;
const AUTO_PULL_INTERVAL_MS = 5*60*1000;

// =====================
// MASTER DATA & UI INIT
// =====================
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
];

const prov=document.getElementById('prov'); const kab=document.getElementById('kab');
const fProv=document.getElementById('fProv'); const fKab=document.getElementById('fKab');
const fStart=document.getElementById('fStart'); const fEnd=document.getElementById('fEnd');
const fTimeMode=document.getElementById('fTimeMode'); const fYearStart=document.getElementById('fYearStart'); const fYearEnd=document.getElementById('fYearEnd');

function _bindHeaderShadow(){
  const h=document.querySelector('header'); if(!h) return;
  const onscroll=()=>{ if(window.scrollY>4) h.classList.add('scrolled'); else h.classList.remove('scrolled'); };
  window.addEventListener('scroll', onscroll, {passive:true}); onscroll();
}
function _syncTimeModeUI(){
  const mode=(document.getElementById('fTimeMode'(())&&().value)))||'month';
  const mWrap=document.getElementById('monthRangeWrap');
  const yWrap=document.getElementById('yearRangeWrap');
  if(mode==='month'){
    ((mWrap)&&(mWrap.classList)).remove('inactive');
    ((yWrap)&&(yWrap.classList)).remove('active');
    ((yWrap)&&(yWrap.classList)).add('inactive');
  }else{
    ((yWrap)&&(yWrap.classList)).add('active');
    ((mWrap)&&(mWrap.classList)).add('inactive');
  }
}
document.getElementById('fTimeMode'(())&&().addEventListener))('change', _syncTimeModeUI);

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
// GEJALA & PAPARAN
// =====================
let hasInteractedGejala=false;
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
    const toggle=()=>{ hasInteractedGejala=true; dt.style.display = cb.checked ? '' : 'none'; dt.required = cb.checked; if(cb.checked && !dt.value) dt.value=today; updateOnset(); updateDefinisiBadge(); toggleManualOnset(); };
    cb.addEventListener('change', toggle);
    dt.addEventListener('change', ()=>{ updateOnset(); updateDefinisiBadge(); });
  });
}
function gejalaCheckedCount(){ let c=0; GEJALA.forEach(g=>{ const cb=document.getElementById('g_'+g.id); if(cb && cb.checked) c++; }); return c; }
function toggleManualOnset(){ const wrap=document.getElementById('manualOnsetWrap'); if(!wrap) return; const show = hasInteractedGejala && gejalaCheckedCount()===0; wrap.classList.toggle('hidden', !show); }
function getManualOnsetDate(){ const el=document.getElementById('onsetManual'); if(el && el.value){ try{ return new Date(el.value);}catch(_){ return null; } } return null; }

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
  if(!earliest){
    const m=getManualOnsetDate(); if(m) earliest=m;
  }
  return earliest;
}
function updateOnset(){ const onset=getOnsetDate(); document.getElementById('onsetTag').textContent = onset ? onset.toISOString().slice(0,10) : "—"; }
function getRadio(name){ return (document.querySelector('input[name="'+name+'"]:checked'(())&&().value)))||''; }

function computeDefinisi(){
  const S={}; GEJALA.forEach(g=>{ S[g.id]=document.getElementById('g_'+g.((id))&&(id).checked)); });
  const anyExposure = PAPARAN.some((_,idx)=> document.getElementById('p_'+((idx))&&(idx).checked)) );
  const leuk=parseFloat(document.getElementById('leukosit').value);
  const trom=parseFloat(document.getElementById('trombosit').value);
  const bili=parseFloat(document.getElementById('bilirubin').value);
  const amil=parseFloat(document.getElementById('amilase').value);
  const cpk =parseFloat(document.getElementById('cpk').value);
  const proteinuria=document.getElementById('proteinuria').checked;
  const hematuria=document.getElementById('hematuria').checked;
  const rdt=getRadio('rdt'), mat=getRadio('mat'), pcr=getRadio('pcr');
  const hasFever=!!S.demam; const supportMinor=(S.mialgia||S.malaise||S.conj);
  const suspek=hasFever&&supportMinor&&anyExposure;

  const severeList=[S.nyeriBetis,S.jaundice,S.anuria,S.perdarahan,S.sesak,S.aritmia,S.batuk,S.ruam];
  const severeCount=severeList.filter(Boolean).length;
  const crit1=suspek && severeCount>=2;     // klinis
  const crit2=(rdt==='pos');               // RDT
  const labA=(!isNaN(trom)&&trom<100);
  const labB=(!isNaN(leuk)&&(leuk<3.5||leuk>10.5));
  const labC=((!isNaN(bili)&&bili>2)||(!isNaN(amil)&&amil>110)||(!isNaN(cpk)&&cpk>200));
  const labD=(proteinuria||hematuria);
  const labCount=[labA,labB,labC,labD].filter(Boolean).length;
  const crit3=suspek && labCount>=3;       // lab komposit

  const probable=(crit1||crit2||crit3);
  const confirmed=((suspek||probable)&&(mat==='pos'||pcr==='pos'));

  let def="Tidak memenuhi";
  if(confirmed) def="Confirm";
  else if(probable) def="Probable";
  else if(suspek) def="Suspek";
  return def;
}
function updateDefinisiBadge(){
  const def=computeDefinisi(); const badge=document.getElementById('defBadge');
  badge.textContent="Definisi Kasus: "+def; badge.className='badge';
  if(def==='Confirm') badge.classList.add('ok');
  else if(def==='Probable') badge.classList.add('warn');
  else if(def==='Suspek') badge.classList.add('neutral');
  else badge.classList.add('bad');
}
['leukosit','trombosit','bilirubin','sgot','sgpt','kreatinin','amilase','cpk'].forEach(id=>{
  const el=document.getElementById(id);
  el && el.addEventListener('input', ()=>{ updateDefinisiBadge(); });
});

// ↑ listener cepat untuk radio PCR/MAT/RDT
function bindRapidRadioUpdates(){
  ['rdt','mat','pcr'].forEach(name=>{
    document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
      const h=()=>{ updateDefinisiBadge(); };
      r.addEventListener('change', h);
      r.addEventListener('click', h);
      r.addEventListener('input', h);
    });
  });
}

// =====================
// DATA & UUID
// =====================
function genUUID(){
  try{ if (crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(_){}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8); return v.toString(16);
  });
}
let editingIndex=-1; let editingUUID=null;
function norm(s){ return (s||"").toString().trim().toLowerCase().replace(/\s+/g,' '); }
function duplicateKey(d){ return [norm(d.nama),norm(d.umur),norm(d.alamat),d.onset||''].join('|'); }
function getKey(d){ return (d && d.uuid) ? ('uuid:'+d.uuid) : ('dup:'+duplicateKey(d)); }

function loadCases(){ try{return JSON.parse(localStorage.getItem('lepto_cases')||'[]');}catch(e){return[]} }

function isMeaningfulCase(d){
  if(!d) return false;
  const hasId = !!(d.uuid && String(d.uuid).trim().length>0);
  const hasName = !!(d.nama && String(d.nama).trim().length>0);
  const hasLoc = !!((d.prov && String(d.prov).trim().length>0) || (d.kab && String(d.kab).trim().length>0));
  const hasOnset = !!(d.onset && String(d.onset).trim().length>0);
  const hasStatus = !!(d.statusAkhir && String(d.statusAkhir).trim().length>0);
  const L = d.lab || {}; const hasLab = (L.rdt && L.rdt!=='nd') || (L.mat && L.mat!=='nd') || (L.pcr && L.pcr!=='nd');
  return hasId || hasName || hasLoc || hasOnset || hasStatus || hasLab;
}
function saveCases(arr){
  const toDate = s => { try{ return new Date(s); }catch(_){ return new Date(0);} };
  const cleaned = (Array.isArray(arr)?arr:[]).filter(isMeaningfulCase);
  const byKey = new Map();
  for(const d of cleaned){
    const k = getKey(d);
    if(!byKey.has(k)) byKey.set(k, d);
    else {
      const a = byKey.get(k);
      const tA = toDate(a.savedAt||a.tglStatus||a.onset||'1970-01-01');
      const tB = toDate(d.savedAt||d.tglStatus||d.onset||'1970-01-01');
      if(tB>tA) byKey.set(k, d);
    }
  }
  const unique = Array.from(byKey.values());
  localStorage.setItem('lepto_cases', JSON.stringify(unique));
}
function ensureUUIDs(){ const arr=loadCases(); let changed=false; arr.forEach(d=>{ if(!d.uuid){ d.uuid=genUUID(); changed=true; } }); if(changed) saveCases(arr); }

function getFormData(){
  const onsetDate=getOnsetDate();
  const gejala={}; const gejalaTgl={};
  GEJALA.forEach(g=>{ gejala[g.label]=document.getElementById('g_'+g.id).checked; gejalaTgl[g.label]=(document.getElementById('d_'+g.id).value||""); });
  const paparan=PAPARAN.map((p,idx)=>({label:p,checked:document.getElementById('p_'+idx).checked}));
  const currUuid = (editingIndex>=0 ? (loadCases()[((editingIndex])&&(editingIndex].uuid))) : null) || editingUUID || genUUID();
  return {
    uuid: currUuid,
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
  hasInteractedGejala=false;
  document.querySelectorAll('input,select,textarea').forEach(el=>{
    if(el.type==='checkbox'||el.type==='radio') el.checked=false; else el.value='';
  });
  initProvKab(); initGejalaChecklist(); initPaparanChecklist();
  toggleManualOnset(); updateOnset(); updateDefinisiBadge();
}
function loadCaseIntoForm(d){
  editingUUID = d.uuid || null;
  document.getElementById('nama').value = d.nama||'';
  document.getElementById('jk').value = d.jk||'';
  document.getElementById('umur').value = d.umur||'';
  document.getElementById('kerja').value = d.kerja||'';
  document.getElementById('prov').value = d.prov||''; document.getElementById('prov').dispatchEvent(new Event('change'));
  setTimeout(()=>{ document.getElementById('kab').value = d.kab||''; }, 0);
  document.getElementById('alamat').value = d.alamat||'';

  initGejalaChecklist();
  Object.entries(d.gejala||{}).forEach(([label,checked])=>{
    const g = GEJALA.find(x => x.label === label);
    if(g){
      const cb = document.getElementById('g_'+g.id);
      const dt = document.getElementById('d_'+g.id);
      if(cb){ cb.checked = !!checked; }
      const tgl = (d.gejalaTgl||{})[label] || '';
      if(dt){ if(cb.checked){ dt.style.display=''; dt.value = tgl; } else { dt.style.display='none'; dt.value = ''; } }
    }
  });
  toggleManualOnset(); updateOnset();

  initPaparanChecklist();
  (d.paparan||[]).forEach((p,idx)=>{ const el = document.getElementById('p_'+idx); if(el) el.checked = !!p.checked; });

  const Lb=d.lab||{};
  const setVal=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=(v??''); };
  ['leukosit','trombosit','bilirubin','sgot','sgpt','kreatinin','amilase','cpk','serovar'].forEach(id=> setVal(id, Lb[id]));
  const setRadio=(name,v)=>{ const el=document.querySelector(`input[name="${name}"][value="${v}"]`); if(el) el.checked=true; };
  setRadio('rdt', Lb.rdt||'nd'); setRadio('mat', Lb.mat||'nd'); setRadio('pcr', Lb.pcr||'nd');
  document.getElementById('proteinuria').checked=!!Lb.proteinuria;
  document.getElementById('hematuria').checked=!!Lb.hematuria;

  document.getElementById('statusAkhir').value=d.statusAkhir||'';
  document.getElementById('tglStatus').value=d.tglStatus||'';
  document.getElementById('obat').value=d.obat||'';

  updateDefinisiBadge(); bindRapidRadioUpdates();
  document.getElementById('simpan').textContent = 'Update Kasus';
  document.body.classList.add('editing');
  window.scrollTo({top:0, behavior:'smooth'});
}
function cancelEdit(){ editingIndex=-1; editingUUID=null; document.getElementById('simpan').textContent='Simpan Kasus'; document.body.classList.remove('editing'); resetForm(); }
document.getElementById('cancelEdit').addEventListener('click', (e)=>{ e.preventDefault(); cancelEdit(); });

function renderCounts(){
  const data=loadCases(); const counts={Suspek:0,Probable:0,Confirm:0,Other:0};
  data.forEach(d=>{ if(d.definisi==='Suspek') counts.Suspek++; else if(d.definisi==='Probable') counts.Probable++; else if(d.definisi==='Confirm') counts.Confirm++; else counts.Other++; });
  const box=document.getElementById('counts'); box.innerHTML='';
  Object.entries(counts).forEach(([k,v])=>{ const span=document.createElement('span'); const cls=k==='Confirm'?'ok':(k==='Probable'?'warn':(k==='Suspek'?'':'bad')); span.className='tag '+cls; span.textContent=`${k}: ${v}`; box.appendChild(span); });
}
function defClass(def){ if(def==='Confirm') return 'ok'; if(def==='Probable') return 'warn'; if(def==='Suspek') return ''; return 'bad'; }
function renderTable(){
  const tbody=document.querySelector('#casesTable tbody'); tbody.innerHTML='';
  const data=(loadCases()||[]).filter(isMeaningfulCase);
  data.forEach((d,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td title="${d.uuid||''}">${d.nama}</td><td>${d.umur}</td><td>${d.prov}</td><td>${d.kab}</td>
      <td>${d.onset||'-'}</td><td><span class="tag ${defClass(d.definisi)}">${d.definisi}</span></td>
      <td>${d.statusAkhir||'-'}</td>
      <td><button class="btn small" data-edit="${i}">Edit</button> <button class="btn small" data-del="${i}">Hapus</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button[data-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const i=+btn.dataset.edit; const arr=loadCases(); editingIndex=i; loadCaseIntoForm(arr[i]); });
  });
  tbody.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const i=+btn.dataset.del; const arr=loadCases(); arr.splice(i,1); saveCases(arr); renderTable(); renderCounts(); updateCharts(); recalcCasesFromLocalAndRefresh(); });
  });
}

\1data.definisi = computeDefinisi(); data.savedAt = new Date().toISOString(); if(!data.nama){ alert('Nama wajib diisi.'); return; }
  if(!data.prov||!data.kab){ alert('Provinsi dan Kabupaten/Kota wajib dipilih.'); return; }
  const arr=loadCases(); if(editingIndex>=0){ arr[editingIndex]=data; saveCases(arr); cancelEdit(); } else { arr.push(data); saveCases(arr); }
  renderTable(); renderCounts(); updateCharts(); recalcCasesFromLocalAndRefresh();
  if(typeof sendRowToSheets==='function'){ try{ sendRowToSheets(flattenCase(data)); }catch(_e){} }
  alert('Kasus disimpan.');
});

document.getElementById('cekDup').addEventListener('click', ()=>{
  const arr=loadCases(); const seen={}; const dups=new Set();
  arr.forEach((d,i)=>{ const k=duplicateKey(d); if(seen[k]!==undefined){ dups.add(i); dups.add(seen[k]); } else { seen[k]=i; } });
  const rows=document.querySelectorAll('#casesTable tbody tr');
  rows.forEach((tr,i)=>tr.style.backgroundColor = dups.has(i) ? '#fff7e6' : '');
  alert(duplikatMsg(dups.size));
  function duplikatMsg(n){ return n ? 'Duplikat ditemukan & ditandai krem.' : 'Tidak ada duplikat.'; }
});
document.getElementById('hapusDup').addEventListener('click', ()=>{
  const arr=loadCases(); const seen={}; const result=[];
  arr.forEach(d=>{ const k=duplicateKey(d); if(!(k in seen)){ seen[k]=true; result.push(d); } });
  const removed=arr.length-result.length; saveCases(result);
  renderTable(); renderCounts(); updateCharts(); recalcCasesFromLocalAndRefresh();
  alert(removed>0?('Menghapus '+removed+' duplikat.'):'Tidak ada duplikat untuk dihapus.');
});

// =====================
// CHARTS
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
  const arr=(loadCases()||[]).filter(isMeaningfulCase);
  const fp=fProv.value||""; const fk=fKab.value||"";
  const mode=fTimeMode.value||'month';
  const ms=fStart.value||""; const me=fEnd.value||"";
  const ys=(fYearStart.value||''); const ye=(fYearEnd.value||'');
  const filtered=arr.filter(d=>{
    if(fp&&d.prov!==fp) return false;
    if(fk&&d.kab!==fk) return false;
    const ds=getDateForAgg(d);
    return (mode==='month') ? withinRangeMonth(ds,ms,me) : withinRangeYear(ds,ys,ye);
  });
  const agg={}; filtered.forEach(d=>{ const ds=getDateForAgg(d); const key=(mode==='month')? monthKey(ds) : yearKey(ds); if(!key) return; agg[key]=(agg[key]||0)+1; });
  const keys=Object.keys(agg).sort(); trendChart.data.labels=keys; trendChart.data.datasets[0].data=keys.map(k=>agg[k]||0); trendChart.update();
  const perKab={}; filtered.forEach(d=>{ const kk=d.kab||'(Tidak diisi)'; perKab[kk]=(perKab[kk]||0)+1; });
  const kLabels=Object.keys(perKab).sort(); kabChart.data.labels=kLabels; kabChart.data.datasets[0].data=kLabels.map(k=>perKab[k]||0); kabChart.update();
}
document.getElementById('applyFilter').addEventListener('click', updateCharts);

// =====================
// PETA
// =====================
function getColor(val){ const v=Number(val)||0; if(v===0) return '#ffffff'; if(v>0&&v<=50) return '#ffc4c4'; if(v>50&&v<=200) return '#ff7a7a'; return '#cc0000'; }
let geojsonLayer; let _labels=[]; window._leaf_map = null;
function ensureMap(){ if(window._leaf_map) return window._leaf_map; window._leaf_map=L.map('map',{zoomControl:true,attributionControl:false}); window.addEventListener('resize', ()=>{ try{ window._leaf_map.invalidateSize(); }catch(_){}}); return window._leaf_map; }
let casesByProvince={"Aceh":12,"Sumatera Utara":28,"Sumatera Barat":8,"Riau":15,"Jambi":5,"Sumatera Selatan":31,"Bengkulu":2,"Lampung":44,"Kepulauan Bangka Belitung":1,"Kepulauan Riau":3,"DKI Jakarta":320,"Jawa Barat":188,"Jawa Tengah":96,"DI Yogyakarta":45,"Jawa Timur":210,"Banten":74,"Bali":12,"Nusa Tenggara Barat":9,"Nusa Tenggara Timur":20,"Kalimantan Barat":6,"Kalimantan Tengah":4,"Kalimantan Selatan":11,"Kalimantan Timur":7,"Kalimantan Utara":1,"Sulawesi Utara":5,"Sulawesi Tengah":6,"Sulawesi Selatan":130,"Sulawesi Tenggara":4,"Gorontalo":1,"Sulawesi Barat":2,"Maluku":1,"Maluku Utara":1,"Papua Barat":1,"Papua":2,"Papua Selatan":0,"Papua Tengah":0,"Papua Pegunungan":0};
function totalNational(){ return Object.values(casesByProvince).reduce((a,b)=>a+(+b||0),0); }
function getProvName(props){ return ((props)&&(props.provinsi))||((props)&&(props.Provinsi))||((props)&&(props.PROVINSI))||((props)&&(props.NAME_1))||((props)&&(props.Name))||((props)&&(props.WADMPR))||((props)&&(props.wadmpr))||((props)&&(props.WADMPRV))||((props)&&(props.nama))||((props)&&(props.name))||''; }
function styleFeature(feat){ const prov=getProvName(feat.properties||{}); const val=+casesByProvince[prov]||0; return {weight:1,color:'#9ca3af',fillColor:getColor(val),fillOpacity:0.8}; }
function highlightFeature(e){ e.target.setStyle({weight:2,fillOpacity:0.9,color:'#6b7280'}); if(e.target && typeof e.target.bringToFront==='function') e.target.bringToFront(); }
function resetHighlight(e){ geojsonLayer && geojsonLayer.resetStyle(e.target); }
function onEachFeature(feature, layer){
  const prov=getProvName(feature.properties||{}); const val=+casesByProvince[prov]||0;
  if(prov && !(prov in casesByProvince)) console.warn('⚠️ Nama provinsi pada GeoJSON tidak cocok:', prov);
  const pct=totalNational()?((val/totalNational())*100).toFixed(1):'0.0';
  layer.bindTooltip(`${prov||'(tanpa nama)'}: ${val.toLocaleString('id-ID')} kasus`,{sticky:true});
  layer.on({mouseover:highlightFeature,mouseout:resetHighlight,click:()=>{ layer.bindPopup(`<b>${prov||'(tanpa nama)'}</b><br>Kasus: ${val.toLocaleString('id-ID')}<br>Kontribusi nasional: ${pct}%`).openPopup(); }});
}
function addCenterLabels(){
  if(!window._leaf_map||!geojsonLayer) return;
  _labels.forEach(l=>window._leaf_map.removeLayer(l)); _labels=[];
  geojsonLayer.eachLayer(layer=>{
    const prov=getProvName(layer.((feature)&&(feature.properties))||{}); const val=+casesByProvince[prov]||0;
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
(function(){ var __el=document.getElementById('recalcMap'); if(__el) __el.addEventListener('click', ()=>recalcCasesFromLocalAndRefresh());
(function(){ var __el=document.getElementById('exportPng'); if(__el) __el.addEventListener('click', exportPNG);
async function initMap(){
  ensureMap();
  try{
    const data=await loadFromUrl(DEFAULT_GH);
    renderChoropleth(data);
    recalcCasesFromLocalAndRefresh();
    document.getElementById('mapMsg').textContent = '';
  }catch(err){ /* pesan sudah ditampilkan */ }
}

// =====================
// EKSPOR EXCEL
// =====================
function flattenCase(d){
  const row={ 'UUID':d.uuid||'', 'Nama':d.nama,'Jenis Kelamin':d.jk,'Umur':d.umur,'Pekerjaan':d.kerja,'Provinsi':d.prov,'Kab/Kota':d.kab,'Alamat':d.alamat,'Onset':d.onset,'Tanggal Paparan':d.tglPaparan,'Definisi':d.definisi,'Status Akhir':d.statusAkhir,'Tanggal Status':d.tglStatus,'Obat':d.obat,'Saved At':d.savedAt };
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
// GOOGLE SHEETS (anti duplikat + full sync)
// =====================
function setPullStatus(msg){ const el=document.getElementById('pullStatus'); if(el) el.textContent=msg||''; }
function parseGVizJSON(text){
  const start=text.indexOf('{'); const end=text.lastIndexOf('}');
  if(start<0||end<0) throw new Error('Format GViz tidak dikenali');
  const json=JSON.parse(text.slice(start,end+1));
  const table=json.table;
  const headers=(table.cols||[]).map(c=>c.label||c.id);
  const rows=(table.rows||[]).map(r=>(r.c||[]).map(c=>c?(c.v??''):''));
  return rows.map(vals=>{ const o={}; headers.forEach((h,i)=>o[h]=vals[i]); return o; });
}

function normKey(k){
  return String(k||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
}
function pick(row, names){
  // Build normalized map once
  const map = {}; Object.keys(row||{}).forEach(k=> map[normKey(k)] = row[k]);
  for(const name of names){
    const v = map[normKey(name)];
    if(v!==undefined && v!==null && (String(v).trim().length>0)) return v;
  }
  return '';
}
function flatToCase(r){
  return {
    uuid: pick(r, ['UUID','Uid','Id','ID','uuid']),
    nama: pick(r, ['Nama','Name','Nama Pasien','Nama Lengkap']),
    jk: pick(r, ['Jenis Kelamin','JK','Gender']),
    umur: pick(r, ['Umur','Usia','Age']),
    kerja: pick(r, ['Pekerjaan','Profesi']),
    prov: pick(r, ['Provinsi','Prov']),
    kab:  pick(r, ['Kab/Kota','Kabupaten/Kota','Kabupaten','Kota','KabKota']),
    alamat: pick(r, ['Alamat','Alamat Lengkap']),
    onset: pick(r, ['Onset','Tanggal Onset','Tgl Onset','Tanggal Mulai Gejala']),
    tglPaparan: pick(r, ['Tanggal Paparan','Tgl Paparan']),
    gejala: {}, gejalaTgl: {},
    paparan: [],
    lab: {
      leukosit: pick(r, ['Leukosit (x10^3/µL)','Leukosit']),
      trombosit: pick(r, ['Trombosit (x10^3/µL)','Trombosit']),
      bilirubin: pick(r, ['Bilirubin (mg/dL)','Bilirubin']),
      sgot: pick(r, ['SGOT (U/L)','SGOT']),
      sgpt: pick(r, ['SGPT (U/L)','SGPT']),
      kreatinin: pick(r, ['Kreatinin (mg/dL)','Kreatinin']),
      rdt: (String(pick(r,['RDT'])).toLowerCase().startsWith('pos')?'pos':(String(pick(r,['RDT'])).toLowerCase().startsWith('neg')?'neg':'nd')),
      mat: (String(pick(r,['MAT'])).toLowerCase().startsWith('pos')?'pos':(String(pick(r,['MAT'])).toLowerCase().startsWith('neg')?'neg':'nd')),
      pcr: (String(pick(r,['PCR'])).toLowerCase().startsWith('pos')?'pos':(String(pick(r,['PCR'])).toLowerCase().startsWith('neg')?'neg':'nd')),
      serovar: pick(r, ['Serovar']),
      amilase: pick(r, ['Amilase (U/L)','Amilase']),
      cpk: pick(r, ['CPK (U/L)','CPK']),
      proteinuria: /ya/i.test(String(pick(r, ['Proteinuria']))),
      hematuria: /ya/i.test(String(pick(r, ['Hematuria']))),
    },
    statusAkhir: pick(r, ['Status Akhir','Status']),
    tglStatus: pick(r, ['Tanggal Status','Tgl Status','Tgl Update']),
    obat: pick(r, ['Obat']),
    savedAt: pick(r, ['Saved At','SavedAt','Timestamp','Created At','Created'])
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
  const arr = flat.map(flatToCase).filter(isMeaningfulCase);
  return arr;
}

async function pullFromSheets(opts={merge:true, silent:false}){
  if(!SPREADSHEET_ID || SPREADSHEET_ID.startsWith('GANTI_')){
    if(!opts.silent) alert('SPREADSHEET_ID belum diisi di script.js');
    return;
  }
  try{
    const remoteCases = await readSheetCases();
    if(opts.merge){
      const local = loadCases();
      const merged = mergeCases(local, remoteCases);
      saveCases(merged);
    } else {
      saveCases(remoteCases);
    }
    dedupeLocalInPlace();
    renderTable(); renderCounts(); updateCharts(); recalcCasesFromLocalAndRefresh();
    const now = new Date().toLocaleString('id-ID');
    setPullStatus(`Tarik otomatis OK • ${now}`);
    if(!opts.silent) alert('Data dari Google Sheet sudah dimuat/di-merge.');
  }catch(e){
    console.error('pullFromSheets error', e);
    setPullStatus('Gagal tarik otomatis (cek publish Sheet & ID)');
    if(!opts.silent) alert('Gagal menarik data dari Google Sheet. Pastikan Sheet di-publish ke web.');
  }
}
(function(){ var __el=document.getElementById('pullSheets'); if(__el) __el.addEventListener('click', ()=>pullFromSheets({merge:true, silent:false}));

async function sendRowToSheets(row){
  if(!SHEETS_URL){ console.warn('SHEETS_URL kosong'); return; }
  try{
    const arr = loadCases(); ensureUUIDs();
    const key = getKey(arr[arr.length-1] || {});
    const sent = JSON.parse(localStorage.getItem('lepto_sent_keys')||'[]');
    if(sent.includes(key)){ console.log('Lewati kirim: baris sudah pernah dikirim'); return; }
    await fetch(SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: ACCESS_TOKEN, action: 'append', row })
    });
    sent.push(key); localStorage.setItem('lepto_sent_keys', JSON.stringify(sent));
  }catch(e){ console.warn('Gagal kirim Sheets:', e); }
}

async function sendAllToSheets(){
  if(!SHEETS_URL){ alert('SHEETS_URL belum diisi.'); return; }
  ensureUUIDs();
  let arr = loadCases();
  if(!arr.length){ alert('Tidak ada data.'); return; }
  // dedupe lokal pilih terbaru per key
  const localByKey = new Map();
  const toDate = s => { try{ return new Date(s); }catch(_){ return new Date(0);} };
  for(const d of arr){
    const k=getKey(d);
    if(!localByKey.has(k)) localByKey.set(k, d);
    else {
      const a=localByKey.get(k);
      const tA=toDate(a.savedAt||a.tglStatus||a.onset||'1970-01-01');
      const tB=toDate(d.savedAt||d.tglStatus||d.onset||'1970-01-01');
      if(tB>tA) localByKey.set(k, d);
    }
  }
  let toSend = Array.from(localByKey.values());
  try{
    const remote = await readSheetCases();
    const remoteKeys = new Set(remote.map(getKey));
    toSend = toSend.filter(d => !remoteKeys.has(getKey(d)));
  }catch(e){
    console.warn('Lewati cek duplikat dari Sheet (GViz tidak tersedia):', e);
  }
  if(toSend.length === 0){
    alert('Tidak ada baris baru untuk dikirim (semua sudah ada di Sheet).');
    return;
  }
  try{
    await fetch(SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: ACCESS_TOKEN, action: 'appendBatch', rows: toSend.map(flattenCase) })
    });
    alert('Permintaan sync dikirim: '+toSend.length+' baris baru.');
  }catch(e){ alert('Gagal sync: '+e); }
}
(function(){ var __el=document.getElementById('syncSheets'); if(__el) __el.addEventListener('click', sendAllToSheets);

async function sendReplaceAllToSheets(){
  if(!SHEETS_URL){ alert('SHEETS_URL belum diisi.'); return; }
  ensureUUIDs();
  let arr = loadCases();
  if(!arr.length){ alert('Tidak ada data lokal untuk disinkronkan.'); return; }
  const byKey = new Map();
  const toDate = s => { try{ return new Date(s); }catch(_){ return new Date(0);} };
  for(const d of arr){
    const k = getKey(d);
    if(!byKey.has(k)){ byKey.set(k, d); }
    else {
      const a = byKey.get(k);
      const tA = toDate(a.savedAt||a.tglStatus||a.onset||'1970-01-01');
      const tB = toDate(d.savedAt||d.tglStatus||d.onset||'1970-01-01');
      if(tB > tA) byKey.set(k, d);
    }
  }
  const uniqueLatest = Array.from(byKey.values());
  const ok = confirm('PERINGATAN: Tindakan ini akan MENGGANTI seluruh isi sheet dengan '+uniqueLatest.length+' baris dari aplikasi ini.\nLanjutkan?');
  if(!ok) return;
  try{
    await fetch(SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: ACCESS_TOKEN, action: 'replaceAll', rows: uniqueLatest.map(flattenCase) })
    });
    alert('Permintaan Full Sync (Replace All) dikirim. Periksa Google Sheet Anda.');
  }catch(e){
    alert('Gagal Full Sync: '+e);
  }
}
(function(){ var __el=document.getElementById('fullSyncSheets'); if(__el) __el.addEventListener('click', sendReplaceAllToSheets);

// Jadwal auto-pull setelah login
let _autoTimer = null;
async function scheduleAutoPull(){
  if(!AUTO_PULL) return;
  await pullFromSheets({merge:true, silent:true});
  if(_autoTimer) clearInterval(_autoTimer);
  _autoTimer = setInterval(()=>pullFromSheets({merge:true, silent:true}), AUTO_PULL_INTERVAL_MS);
}

// =====================
// AUTO UPDATE & STARTUP + TOKEN CORE
(function(){
  const OK_KEY = 'lepto_token_ok';
  let unlocked = false;

  function hideLock(){
    const el=document.getElementById('lock');
    if(el){ el.remove(); document.body.classList.remove('locked'); }
  }
  function showLock(){
    const el=document.getElementById('lock');
    if(!el) return;
    el.classList.remove('hidden');
    document.body.classList.add('locked');
    bindHandlers();
    setTimeout(()=>(function(){var __el=document.getElementById('tokenInput'); if(__el) __el.focus(); })(), 50);
  }
  function bindHandlers(){
    const btn=document.getElementById('unlockBtn');
    const form=document.getElementById('lockForm');
    const input=document.getElementById('tokenInput');
    const err=document.getElementById('lockErr');
    if(err){ err.style.display='none'; err.textContent=''; }
    if(btn){ btn.onclick = (e)=>{ e.preventDefault(); verifyToken(); }; }
    if(form){ form.onsubmit = (e)=>{ e.preventDefault(); verifyToken(); }; }
    if(input){ input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); verifyToken(); } }); }
  }
  function afterUnlock(){
    if(unlocked) return; unlocked = true;
    hideLock();
    try{ renderTable(); renderCounts(); updateCharts(); }catch(_){}
    try{ recalcCasesFromLocalAndRefresh(); }catch(_){}
    setTimeout(()=>{
      try{ initMap(); }catch(_){}
      try{ (function(){try{ if(typeof trendChart!=='undefined' && trendChart) trendChart.resize(); }catch(_){} })(); (function(){try{ if(typeof kabChart!=='undefined' && kabChart) kabChart.resize(); }catch(_){} })(); }catch(_){}
      setTimeout(()=>{ if(window._leaf_map){ try{ if(window._leaf_map) window._leaf_map.invalidateSize(); fitIndonesia(); }catch(_){} } },200);
      try{ scheduleAutoPull(); }catch(_){}
    },100);
  }
  function verifyToken(){
    const val=(document.getElementById('tokenInput'(())&&().value))||'').trim();
    const err=document.getElementById('lockErr');
    if(val===ACCESS_TOKEN){
      try{ localStorage.setItem(OK_KEY,'1'); localStorage.setItem('lepto_token', val); }catch(_){}
      afterUnlock();
    } else {
      if(err){ err.textContent='Token salah. Coba lagi.'; err.style.display='block'; }
    }
  }
  function autoUnlockFromURL(){
    try{
      const sp=new URLSearchParams(location.search);
      const t=sp.get('token'); const skip=sp.get('skipToken')==='1';
      if(skip || (t && t.trim()===ACCESS_TOKEN)){
        try{ localStorage.setItem(OK_KEY,'1'); }catch(_){}
        try{ localStorage.setItem('lepto_token', ACCESS_TOKEN); }catch(_){}
        afterUnlock(); return true;
      }
    }catch(_){}
    return false;
  }
  function autoUnlockFromSaved(){
    try{
      const ok = localStorage.getItem(OK_KEY)==='1';
      const tok = (localStorage.getItem('lepto_token')||'').trim();
      if(ok || tok===ACCESS_TOKEN){ afterUnlock(); return true; }
    }catch(_){}
    return false;
  }
  function start(){ if(autoUnlockFromURL()) return; if(autoUnlockFromSaved()) return; showLock(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.__leptoToken = { verifyToken, showLock, afterUnlock };
})();
