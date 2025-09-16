
/*! Gate v1.0 — clean token loader */
(function(){
  'use strict';
  // ====== Konfigurasi Token ======
  var ACCESS_TOKEN = 'ZOOLEPTO123';  // ganti bila perlu
  var OK_KEY = 'lepto_token_ok';
  var TOKEN_KEY = 'lepto_token';
  var APP_SRC = 'app.js';            // file aplikasi utama (dipisah)

  // ====== Helper DOM ======
  function $(id){ return document.getElementById(id); }
  function show(el){ if(el) el.style.display = ''; }
  function hide(el){ if(el) el.style.display = 'none'; }
  function has(el){ return !!el; }

  // ====== Overlay ======
  function openLock(){
    document.body.classList.add('locked');
    var lock = $('lock'); if(!lock){ console.error('Elemen #lock tidak ada'); return; }
    lock.style.display = 'flex';
    var err = $('lockErr'); if(err){ err.style.display = 'none'; err.textContent = ''; }
    var ti = $('tokenInput'); if(ti){ ti.value=''; setTimeout(function(){ try{ ti.focus(); }catch(_){}} , 50); }
    bindLockHandlers();
  }
  function closeLock(){
    document.body.classList.remove('locked');
    var lock = $('lock'); if(lock){ lock.style.display = 'none'; }
  }
  function setOk(token){
    try{
      localStorage.setItem(OK_KEY, '1');
      if(token) localStorage.setItem(TOKEN_KEY, token);
    }catch(_){}
  }

  // ====== Load App after unlock ======
  function loadAppOnce(){
    if (document.querySelector('script[data-app-loaded="1"]')) return;
    var s = document.createElement('script');
    s.src = APP_SRC + '?v=' + Date.now();
    s.async = false;
    s.setAttribute('data-app-loaded', '1');
    s.onerror = function(){ console.error('Gagal memuat ' + APP_SRC); };
    document.body.appendChild(s);
  }
  function unlockAndLoad(tokenFrom){
    setOk(tokenFrom || ACCESS_TOKEN);
    closeLock();
    loadAppOnce();
  }

  // ====== Verifikasi ======
  function verifyToken(){
    var val = ($('tokenInput') && $('tokenInput').value || '').trim();
    var err = $('lockErr');
    if (val === ACCESS_TOKEN){
      unlockAndLoad(val);
    } else {
      if(err){ err.textContent = 'Token salah. Coba lagi.'; err.style.display = 'block'; }
    }
  }

  function bindLockHandlers(){
    var btn = $('unlockBtn'); if(btn) btn.onclick = function(e){ e.preventDefault(); verifyToken(); };
    var form = $('lockForm'); if(form) form.onsubmit = function(e){ e.preventDefault(); verifyToken(); };
    var ti = $('tokenInput'); if(ti) ti.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); verifyToken(); } });
  }

  // ====== Auto-unlock via URL / Saved ======
  function autoUnlockFromURL(){
    try{
      var sp = new URLSearchParams(location.search);
      var t = sp.get('token');
      var skip = sp.get('skipToken') === '1';
      if (skip || (t && t.trim() === ACCESS_TOKEN)){
        unlockAndLoad(ACCESS_TOKEN);
        return true;
      }
    }catch(_){}
    return false;
  }
  function autoUnlockFromSaved(){
    try{
      var ok = localStorage.getItem(OK_KEY) === '1';
      var tok = (localStorage.getItem(TOKEN_KEY) || '').trim();
      if (ok || tok === ACCESS_TOKEN){
        unlockAndLoad(tok);
        return true;
      }
    }catch(_){}
    return false;
  }

  // ====== Start ======
  function start(){
    // Jika sudah auto-unlock → langsung load app
    if (autoUnlockFromURL()) return;
    if (autoUnlockFromSaved()) return;
    // Tampilkan overlay
    openLock();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // Expose untuk debug
  window.__gate = { verifyToken, openLock, closeLock, loadAppOnce };
})();
