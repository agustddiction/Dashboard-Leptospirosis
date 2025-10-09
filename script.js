// =====================
// KONFIGURASI
// =====================
const ACCESS_TOKEN = 'ZOOLEPTO123';
const DEFAULT_GH = 'https://raw.githubusercontent.com/agustddiction/Dashboard-Leptospirosis/main/provinsi.json';
// Google Sheets WRITE (Apps Script /exec)
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxFHgRel9-LTQTc0YIjy5G22BWk1RiqUjjDqCd8XE1Q4tF8h4t5r8X9WL-MwVZ2IyyYHg/exec';
// Google Sheets READ (GViz JSON)
const SPREADSHEET_ID = '1rcySn3UNzsEHCd7t7ld4f-pSBUTrbNDBDgvxjbLcRm4';
const SHEET_NAME = 'Kasus';
const SHEETS_READ_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json`;
const AUTO_SYNC_ENABLED = true;
const AUTO_SYNC_INTERVAL_MS = 2*60*1000; // 2 minutes
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

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
  "Sering melihat tikus/tanda keberadaan tikus",
  "Memiliki hewan peliharaan/ternak di rumah",
  "Menuju kerja/sekolah melewati genangan air/banjir",
  "Di tempat kerja/sekolah terdapat tikus atau tanda keberadaan tikus",
  "Membersihkan got/selokan/kolam tanpa APD",
];


const prov=document.getElementById('prov'); const kab=document.getElementById('kab');
const fProv=document.getElementById('fProv'); const fKab=document.getElementById('fKab');
const fStart=document.getElementById('fStart'); const fEnd=document.getElementById('fEnd');
const fTimeMode=document.getElementById('fTimeMode'); const fYearStart=document.getElementById('fYearStart'); const fYearEnd=document.getElementById('fYearEnd');

// =====================
// SYNC STATUS MANAGEMENT
// =====================
let syncStatus = {
  isOnline: navigator.onLine,
  lastSync: null,
  lastError: null,
  pendingChanges: 0,
  isSyncing: false
};

function updateSyncStatus(message, isError = false) {
  const statusEl = document.getElementById('pullStatus');
  if (statusEl) {
    const now = new Date().toLocaleString('id-ID');
    statusEl.textContent = `${message} • ${now}`;
    statusEl.style.color = isError ? '#dc2626' : '#16a34a';
  }
  
  if (isError) {
    syncStatus.lastError = message;
    console.error('Sync Error:', message);
  } else {
    syncStatus.lastSync = new Date();
    syncStatus.lastError = null;
  }
}

// Monitor online status
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
  const h=document.querySelector('header'); if(!h) return;
  const onscroll=()=>{ if(window.scrollY>4) h.classList.add('scrolled'); else h.classList.remove('scrolled'); };
  window.addEventListener('scroll', onscroll, {passive:true}); onscroll();
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
// IMPROVED UUID AND KEY GENERATION
// =====================
function genUUID(){
  try{ 
    if (crypto && crypto.randomUUID) return crypto.randomUUID(); 
  } catch(_) {}
  return 'xxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
    const r = Math.random()*16|0;
    const v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function normalizeString(str) {
  if (!str) return '';
  return str.toString().trim().toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

function generateDuplicateKey(data) {
  const nama = normalizeString(data.nama || '');
  const umur = (data.umur || '').toString().trim();
  const alamat = normalizeString(data.alamat || '');
  const onset = data.onset || '';
  
  return [nama, umur, alamat, onset].join('|');
}

function getUniqueKey(data) {
  if (data && data.uuid) {
    return `uuid:${data.uuid}`;
  }
  return `dup:${generateDuplicateKey(data)}`;
}

// =====================
// IMPROVED DATA MANAGEMENT
// =====================
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
    syncStatus.pendingChanges = arr.length;
    return true;
  } catch (e) {
    console.error('Error saving cases:', e);
    updateSyncStatus('Gagal menyimpan data lokal', true);
    return false;
  }
}

function ensureUUIDs() {
  const arr = loadCases();
  let changed = false;
  
  arr.forEach(data => {
    if (!data.uuid) {
      data.uuid = genUUID();
      changed = true;
    }
  });
  
  if (changed) {
    saveCases(arr);
  }
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
function getRadio(name){ return (document.querySelector('input[name="'+name+'"]:checked')?.value)||''; }

function computeDefinisi(){
  const S={}; GEJALA.forEach(g=>{ S[g.id]=document.getElementById('g_'+g.id)?.checked; });
  const anyExposure = PAPARAN.some((_,idx)=> document.getElementById('p_'+idx)?.checked );
  const leuk=parseFloat(document.getElementById('leukosit').value);
  const trom=parseFloat(document.getElementById('trombosit').value);
  const bili=parseFloat(document.getElementById('bilirubin').value);
  const amil=parseFloat(document.getElementById('amilase').value);
  const cpk =parseFloat(document.getElementById('cpk').value);
  const proteinuria=document.getElementById('proteinuria')?.checked;
  const hematuria=document.getElementById('hematuria')?.checked;
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
  if (!badge) return;
  badge.textContent="Definisi Kasus: "+def; badge.className='badge';
  if(def==='Confirm') badge.classList.add('ok');
  else if(def==='Probable') badge.classList.add('warn');
  else if(def==='Suspek') badge.classList.add('neutral');
  else badge.classList.add('bad');
}

function bindRapidRadioUpdates(){
  ['rdt','mat','pcr'].forEach(name=>{
    document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
      r.addEventListener('change', updateDefinisiBadge);
    });
  });
}

// =====================
// FORM HANDLING
// =====================
function getFormData(){
  const onsetDate=getOnsetDate();
  const gejala={}; const gejalaTgl={};
  GEJALA.forEach(g=>{ gejala[g.label]=document.getElementById('g_'+g.id).checked; gejalaTgl[g.label]=(document.getElementById('d_'+g.id).value||""); });
  const paparan=PAPARAN.map((p,idx)=>({label:p,checked:document.getElementById('p_'+idx).checked}));
  const currUuid = (editingIndex>=0 ? (loadCases()[editingIndex]?.uuid) : null) || editingUUID || genUUID();
  return {
    uuid: currUuid,
    nama:document.getElementById('nama').value,
    jk:document.getElementById('jk').value,
    umur:document.getElementById('umur').value,
    kerja:document.getElementById('kerja').value,
    prov:document.getElementById('prov').value,
    kab:document.getElementById('kab').value,
    alamat:document.getElementById('alamat').value,gejala, gejalaTgl,
    onset: onsetDate ? onsetDate.toISOString().slice(0,10) : "",paparan,
    lab:{
      leukosit:document.getElementById('leukosit').value,
      trombosit:document.getElementById('trombosit').value,
      bilirubin:document.getElementById('bilirubin').value,
      kreatinin:document.getElementById('kreatinin').value,
      rdt:getRadio('rdt'),
      mat:getRadio('mat'),
    },
    statusAkhir:document.getElementById('statusAkhir').value,
    tglStatus:document.getElementById('tglStatus').value,
    definisi:computeDefinisi(),
    savedAt:new Date().toISOString()
  };
}

function resetForm(){
  hasInteractedGejala=false;
  document.querySelector('.form-column').querySelectorAll('input,select,textarea').forEach(el=>{
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
  ['leukosit','trombosit','bilirubin','kreatinin'].forEach(id=> setVal(id, Lb[id]));
  const setRadio=(name,v)=>{ const el=document.querySelector(`input[name="${name}"][value="${v}"]`); if(el) el.checked=true; };
  setRadio('rdt', Lb.rdt||'nd'); setRadio('mat', Lb.mat||'nd');

  document.getElementById('statusAkhir').value=d.statusAkhir||'';
  document.getElementById('tglStatus').value=d.tglStatus||'';

  updateDefinisiBadge(); bindRapidRadioUpdates();
  document.getElementById('simpan').textContent = 'Update Kasus';
  document.body.classList.add('editing');
  window.scrollTo({top:0, behavior:'smooth'});
}

function cancelEdit(){ 
  editingIndex=-1; 
  editingUUID=null; 
  document.getElementById('simpan').textContent='Simpan Kasus'; 
  document.body.classList.remove('editing'); 
  resetForm(); 
}

// =====================
// RENDERING FUNCTIONS
// =====================
function valueOrDash(v){ return (v===undefined||v===null||String(v).trim()==='') ? '—' : v; }

function calculateAndRenderCFR() {
  const data = loadCases();
  const total = data.length;
  if (total === 0) {
    document.getElementById('cfrDisplay').textContent = 'CFR: 0%';
    return;
  }
  const meninggal = data.filter(d => d.statusAkhir === 'Meninggal').length;
  const cfr = (meninggal / total) * 100;
  document.getElementById('cfrDisplay').textContent = `CFR: ${cfr.toFixed(2)}%`;
}

function renderCounts(){
  const data=loadCases(); 
  const counts={Suspek:0,Probable:0,Confirm:0,Other:0};
  data.forEach(d=>{
    if(d.definisi==='Suspek') counts.Suspek++;
    else if(d.definisi==='Probable') counts.Probable++;
    else if(d.definisi==='Confirm') counts.Confirm++;
    else counts.Other++;
  });
  const box=document.getElementById('counts'); box.innerHTML='';
  Object.entries(counts).forEach(([k,v])=>{
    const span=document.createElement('span');
    const cls=k==='Confirm'?'ok':(k==='Probable'?'warn':(k==='Suspek'?'':'bad'));
    span.className='tag '+cls;
    span.textContent=`${k}: ${v}`;
    box.appendChild(span);
  });
  calculateAndRenderCFR();
}

function defClass(def){ 
  if(def==='Confirm') return 'ok'; 
  if(def==='Probable') return 'warn'; 
  if(def==='Suspek') return ''; 
  return 'bad'; 
}

function renderTable(){
  const tbody=document.querySelector('#casesTable tbody'); 
  tbody.innerHTML='';
  const data=loadCases();
  
  data.forEach((d,i)=>{
    const nameCell = valueOrDash(d.nama);
    const umurCell = valueOrDash(d.umur);
    const jkCell = valueOrDash(d.jk).charAt(0);
    const onsetCell = valueOrDash(d.onset);
    const statusCell = valueOrDash(d.statusAkhir);
    const defCell = d.definisi || 'Tidak memenuhi';
    const defCls = defClass(defCell);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${nameCell}</td>
      <td>${umurCell}</td>
      <td>${jkCell}</td>
      <td>${onsetCell}</td>
      <td>${statusCell}</td>
      <td><span class="tag ${defCls}">${defCell}</span></td>
      <td>
        <button class="btn small info" data-edit="${i}">Edit</button> 
        <button class="btn small danger" data-del="${i}">Hapus</button>
      </td>`;
    tbody.appendChild(tr);
  });
  
  tbody.querySelectorAll('button[data-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ 
      const i=+btn.dataset.edit; 
      const arr=loadCases(); 
      editingIndex=i; 
      loadCaseIntoForm(arr[i]); 
    });
  });
  
  tbody.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ 
      const i=+btn.dataset.del; 
      if (!confirm('Yakin ingin menghapus kasus ini?')) return;
      
      const arr=loadCases(); 
      arr.splice(i,1); 
      saveCases(arr); 
      renderAll();
      
      if (AUTO_SYNC_ENABLED && syncStatus.isOnline) {
        setTimeout(scheduleAutoPull, 1000);
      }
    });
  });
}

function renderAll(){
    renderTable(); 
    renderCounts(); 
    updateCharts(); 
    recalcCasesFromLocalAndRefresh();
}

// =====================
// ACTIONS (SAVE, DUPLICATES, ETC)
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
        cancelEdit();
        renderAll();
        alert('Kasus disimpan.');
        
        if (AUTO_SYNC_ENABLED && syncStatus.isOnline) {
          setTimeout(scheduleAutoPull, 500);
        }
      } else {
        alert('Gagal menyimpan kasus. Silakan coba lagi.');
      }
    });
    
    document.getElementById('cancelEdit').addEventListener('click', (e)=>{ e.preventDefault(); cancelEdit(); });
    document.getElementById('reset').addEventListener('click', (e)=>{ e.preventDefault(); resetForm(); });

    document.getElementById('cekDup').addEventListener('click', ()=>{
      const arr=loadCases(); 
      const seen={}; 
      const dups=new Set();
      
      arr.forEach((d,i)=>{ 
        const k=generateDuplicateKey(d); 
        if(seen[k]!==undefined){ 
          dups.add(i); 
          dups.add(seen[k]); 
        } else { 
          seen[k]=i; 
        } 
      });
      
      const rows=document.querySelectorAll('#casesTable tbody tr');
      rows.forEach((tr,i)=>tr.style.backgroundColor = dups.has(i) ? '#fefce8' : '');
      
      const message = dups.size ? `${dups.size / 2} pasang duplikat ditemukan & ditandai kuning.` : 'Tidak ada duplikat.';
      alert(message);
    });

    document.getElementById('hapusDup').addEventListener('click', ()=>{
      const arr=loadCases(); 
      const seen={}; 
      const result=[];
      
      arr.forEach(d=>{
        const k=generateDuplicateKey(d);
        if(!(k in seen)){
          seen[k]=true;
          result.push(d);
        }
      });
      
      const removed=arr.length-result.length;
      if (removed === 0) {
        alert('Tidak ada duplikat untuk dihapus.');
        return;
      }

      if (confirm(`Menemukan ${removed} duplikat. Hapus?`)) {
          saveCases(result);
          renderAll();
          alert(`Menghapus ${removed} duplikat.`);
          if (AUTO_SYNC_ENABLED && syncStatus.isOnline) {
            setTimeout(scheduleAutoPull, 1000);
          }
      }
    });

    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
}


// =====================
// CHARTS
// =====================
let trendChart, kabChart, umurChart, jkChart;
function ensureCharts(){
  const defaultOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins:{ legend:{ display:false } },
    scales:{ y:{ beginAtZero:true } }
  };
  const pieOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins:{ legend:{ position:'top' } }
  };

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

  // Trend Chart
  const agg={}; filtered.forEach(d=>{ const ds=getDateForAgg(d); const key=(mode==='month')? monthKey(ds) : yearKey(ds); if(!key) return; agg[key]=(agg[key]||0)+1; });
  const keys=Object.keys(agg).sort(); 
  trendChart.data.labels=keys; 
  trendChart.data.datasets[0].data=keys.map(k=>agg[k]||0); 
  trendChart.update();

  // Kab/Kota Chart
  const perKab={}; filtered.forEach(d=>{ const kk=d.kab||'(Tidak diisi)'; perKab[kk]=(perKab[kk]||0)+1; });
  const kLabels=Object.keys(perKab).sort((a, b) => perKab[b] - perKab[a]).slice(0, 15); // Top 15
  kabChart.data.labels=kLabels; 
  kabChart.data.datasets[0].data=kLabels.map(k=>perKab[k]||0); 
  kabChart.update();
  
  // Umur Chart
  const ageGroups = { '0-4':0, '5-14':0, '15-44':0, '45-64':0, '65+':0, 'N/A':0 };
  filtered.forEach(d => {
    const age = parseInt(d.umur, 10);
    if (isNaN(age)) { ageGroups['N/A']++; }
    else if (age <= 4) { ageGroups['0-4']++; }
    else if (age <= 14) { ageGroups['5-14']++; }
    else if (age <= 44) { ageGroups['15-44']++; }
    else if (age <= 64) { ageGroups['45-64']++; }
    else { ageGroups['65+']++; }
  });
  umurChart.data.labels = Object.keys(ageGroups);
  umurChart.data.datasets[0].data = Object.values(ageGroups);
  umurChart.update();
  
  // Jenis Kelamin Chart
  const jkCounts = { 'Laki-laki': 0, 'Perempuan': 0, 'Tidak diisi': 0 };
  filtered.forEach(d => {
    if (d.jk === 'Laki-laki') { jkCounts['Laki-laki']++; }
    else if (d.jk === 'Perempuan') { jkCounts['Perempuan']++; }
    else { jkCounts['Tidak diisi']++; }
  });
  jkChart.data.datasets[0].data = [jkCounts['Laki-laki'], jkCounts['Perempuan'], jkCounts['Tidak diisi']];
  jkChart.update();
}


// =====================

// Initialize map once and load default Indonesia provinces GeoJSON
let _mapInitialized = false;
async function initMap(){
  try{
    ensureMap();
    if(!_mapInitialized){
      try{
        const geo = await loadFromUrl(DEFAULT_GH);
        renderChoropleth(geo);
      }catch(e){
        console.error('GeoJSON load failed:', e);
      }
      _mapInitialized = true;
    } else {
      try{ refreshChoropleth(); }catch(_){}
    }
  }catch(e){
    console.error('initMap error:', e);
  }
}
// PETA
// =====================
function getColor(val){ const v=Number(val)||0; if(v===0) return '#ffffff'; if(v>0&&v<=50) return '#ffc4c4'; if(v>50&&v<=200) return '#ff7a7a'; return '#cc0000'; }
let geojsonLayer; let _labels=[]; window._leaf_map = null;
function ensureMap(){ if(window._leaf_map) return window._leaf_map; window._leaf_map=L.map('map',{zoomControl:true,attributionControl:false}); window.addEventListener('resize', ()=>{ try{ window._leaf_map.invalidateSize(); }catch(_){}}); return window._leaf_map; }
let casesByProvince={"Aceh":12,"Sumatera Utara":28};
function totalNational(){ return Object.values(casesByProvince).reduce((a,b)=>a+(+b||0),0); }
function getProvName(props){ return props?.provinsi||props?.Provinsi||props?.PROVINSI||props?.NAME_1||props?.Name||props?.WADMPR||props?.wadmpr||props?.WADMPRV||props?.nama||props?.name||''; }
function styleFeature(feat){ const prov=getProvName(feat.properties||{}); const val=+casesByProvince[prov]||0; return {weight:1,color:'#9ca3af',fillColor:getColor(val),fillOpacity:0.8}; }
function highlightFeature(e){ e.target.setStyle({weight:2,fillOpacity:0.9,color:'#6b7280'}); e.target.bringToFront?.(); }
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

// =====================
// EKSPOR EXCEL
// =====================
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
  row['RDT']=map3(Lb.rdt); row['MAT']=map3(Lb.mat);
  return row;
}
function exportToExcel(){ const arr=loadCases(); if(arr.length===0){ alert('Tidak ada data untuk diekspor.'); return; } const rows=arr.map(flattenCase); const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Kasus'); XLSX.writeFile(wb,'leptospirosis_cases.xlsx'); }

// =====================
// GOOGLE SHEETS
// =====================
function parseGVizJSON(text){
  const start=text.indexOf('{'); const end=text.lastIndexOf('}');
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
    alamat: r['Alamat']||'',onset: r['Onset']||'',gejala: {}, gejalaTgl: {}, paparan: [],
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
    renderAll();
    updateSyncStatus('Tarik data dari G-Sheet berhasil.');
    if(!opts.silent) alert('Data dari Google Sheet sudah dimuat/di-merge.');
  }catch(e){
    console.error('pullFromSheets error', e);
    updateSyncStatus('Gagal tarik data (cek publish Sheet & ID)', true);
    if(!opts.silent) alert('Gagal menarik data dari Google Sheet. Pastikan Sheet di-publish ke web.');
  }
}

async function sendAllToSheets(silent = false){
  if(!SHEETS_URL){ if(!silent) alert('SHEETS_URL belum diisi.'); return; }
  ensureUUIDs();
  let arr = loadCases();
  if(!arr.length){ if(!silent) alert('Tidak ada data lokal untuk dikirim.'); return; }
  
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
    updateSyncStatus('Mengecek data di G-Sheet...');
    const remote = await readSheetCases();
    const remoteKeys = new Set(remote.map(getKey));
    toSend = toSend.filter(d => !remoteKeys.has(getKey(d)));
  }catch(e){
    console.warn('Gagal cek duplikat dari Sheet (GViz tidak tersedia):', e);
  }
  
  if(toSend.length === 0){
    if(!silent) alert('Tidak ada baris data baru untuk dikirim.');
    updateSyncStatus('Semua data sudah sinkron.');
    return;
  }

  try{
    updateSyncStatus(`Mengirim ${toSend.length} baris baru...`);
    await fetch(SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: ACCESS_TOKEN, action: 'appendBatch', rows: toSend.map(flattenCase) })
    });
    if(!silent) alert(`Permintaan sync dikirim: ${toSend.length} baris baru.`);
    updateSyncStatus('Pengiriman data ke G-Sheet berhasil.');
  }catch(e){ 
      if(!silent) alert('Gagal sync: '+e); 
      updateSyncStatus('Gagal mengirim data.', true);
  }
}

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
  const ok = confirm(`PERINGATAN: Tindakan ini akan MENGGANTI seluruh isi sheet dengan ${uniqueLatest.length} baris dari aplikasi ini.\nLanjutkan?`);
  if(!ok) return;

  try{
    updateSyncStatus(`Mengirim ${uniqueLatest.length} baris (replace)...`);
    await fetch(SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: ACCESS_TOKEN, action: 'replaceAll', rows: uniqueLatest.map(flattenCase) })
    });
    alert('Permintaan Full Sync (Replace All) dikirim. Periksa Google Sheet Anda.');
    updateSyncStatus('Full Sync (Replace All) berhasil dikirim.');
  }catch(e){
    alert('Gagal Full Sync: '+e);
    updateSyncStatus('Gagal Full Sync.', true);
  }
}

let _autoTimer = null;
async function scheduleAutoPull(){
  if(!AUTO_SYNC_ENABLED) return;
  await pullFromSheets({merge:true, silent:true});
  if(_autoTimer) clearInterval(_autoTimer);
  _autoTimer = setInterval(()=>pullFromSheets({merge:true, silent:true}), AUTO_SYNC_INTERVAL_MS);
}


// =====================
// INITIALIZATION & TOKEN
// =====================

function initApp() {
    // Auto-update form logic on input
    const _root=document.querySelector('.form-column');
    const _autoUpd = () => { updateOnset(); updateDefinisiBadge(); toggleManualOnset(); };
    _root.addEventListener('input', _autoUpd, true);
    _root.addEventListener('change', _autoUpd, true);

    // Initial UI setup and data rendering
    _bindHeaderShadow(); 
    _syncTimeModeUI();
    document.getElementById('fTimeMode')?.addEventListener('change', _syncTimeModeUI);

    initGejalaChecklist(); 
    initPaparanChecklist();
    updateOnset(); 
    updateDefinisiBadge(); 
    ensureUUIDs(); 
    renderAll(); 
    bindRapidRadioUpdates();
    setupActionButtons();

    // Map and chart event listeners
    document.getElementById('applyFilter').addEventListener('click', updateCharts);
    document.getElementById('recalcMap')?.addEventListener('click', recalcCasesFromLocalAndRefresh);
    document.getElementById('exportPng')?.addEventListener('click', exportPNG);
    
    // Sheets buttons
    document.getElementById('pullSheets')?.addEventListener('click', ()=>pullFromSheets({merge:true, silent:false}));
    document.getElementById('syncSheets')?.addEventListener('click', ()=>sendAllToSheets(false));
    document.getElementById('fullSyncSheets')?.addEventListener('click', sendReplaceAllToSheets);
    
    // Initialize map and charts
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

    // Start auto-sync schedule
    scheduleAutoPull();
}

(function(){
  const OK_KEY = 'lepto_token_ok';
  function hasOk(){ try{ return localStorage.getItem(OK_KEY)==='1'; }catch(_){ return false; } }
  let unlocked=false;
  
  function hideLock(){ 
      const el=document.getElementById('lock'); 
      if(el){ 
          el.remove(); 
          document.body.classList.remove('locked'); 
      } 
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
    
    const handleSubmit = (e) => {
        e.preventDefault();
        verifyToken();
    };

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
        if(err){ 
            err.textContent='Token salah. Coba lagi.'; 
            err.style.display='block'; 
        } 
    }
  }
  
  function autoUnlockFromURL(){
    try{
      const sp=new URLSearchParams(location.search);
      const t=sp.get('token'); const skip=sp.get('skipToken')==='1';
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
    if(hasOk()){
        afterUnlock(); 
        return; 
    } 
    showLock();
  }
  
  if(document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start); 
  } else {
      start();
  }
  
  window.__leptoToken={ verifyToken, showLock, afterUnlock };
})();
