/* =========================================================
   Shared Frontend Helpers (JSONP) + Speed Optimizations
   - local write queue (write-behind)
   - optimistic UX hooks
   - small in-memory cache (lookups / today)
   ========================================================= */

const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxWN-dz9zvcI0sxYuNT0mFAmn3kSR0kGTTzD2THneTlfsVgD1uTjC8SMneffSOZPyVqlw/exec",
};

const $ = (id) => document.getElementById(id);

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}

function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function formatDatePt(iso){
  const d = new Date(iso + "T00:00:00");
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    weekday:"long", day:"2-digit", month:"long", year:"numeric"
  });
  const s = fmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatMoney(n){
  const v = Number(n || 0);
  return v.toFixed(2).replace(".", ",");
}

// UTF-8 safe base64
function b64utf8(obj){
  const json = JSON.stringify(obj ?? {});
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

function apiJsonp(action, payload = {}, { timeoutMs = 15000 } = {}){
  return new Promise((resolve, reject)=>{
    if (!CONFIG.API_URL) return reject(new Error("CONFIG.API_URL não configurado."));

    const cb = "cb_" + Math.random().toString(36).slice(2);
    let finished = false;

    window[cb] = (resp)=>{
      finished = true;
      cleanup();
      resolve(resp);
    };

    const url = new URL(CONFIG.API_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", cb);
    url.searchParams.set("data", b64utf8(payload));
    url.searchParams.set("_", Date.now().toString());

    const script = document.createElement("script");
    script.src = url.toString();
    script.async = true;

    const t = setTimeout(()=>{
      if (finished) return;
      cleanup();
      reject(new Error("JSONP timeout."));
    }, timeoutMs);

    script.onerror = ()=>{
      if (finished) return;
      cleanup();
      reject(new Error("JSONP request failed (deploy / network)."));
    };

    document.body.appendChild(script);

    function cleanup(){
      clearTimeout(t);
      try{ delete window[cb]; }catch(_){}
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }
  });
}

/* =========================================================
   Small frontend cache (reduces repeat calls during bursts)
========================================================= */
const _memCache = new Map(); // key -> {exp:number, value:any}
function cacheGet(key){
  const it = _memCache.get(key);
  if (!it) return null;
  if (Date.now() > it.exp) { _memCache.delete(key); return null; }
  return it.value;
}
function cachePut(key, value, ttlMs){
  _memCache.set(key, { exp: Date.now() + ttlMs, value });
}
function cacheDrop(prefix){
  for (const k of _memCache.keys()){
    if (String(k).startsWith(prefix)) _memCache.delete(k);
  }
}

/* =========================================================
   Local write queue (write-behind)
========================================================= */
const SYNC_KEY = "hb_sync_queue_v1";
let _syncing = false;

function _loadQueue(){
  try { return JSON.parse(localStorage.getItem(SYNC_KEY) || "[]"); }
  catch { return []; }
}
function _saveQueue(q){
  localStorage.setItem(SYNC_KEY, JSON.stringify(q));
}
function queueSize(){
  return _loadQueue().length;
}
function _emitSync(status){
  window.dispatchEvent(new CustomEvent("hb:sync", { detail: status }));
}

function enqueue(action, payload){
  const q = _loadQueue();
  q.push({
    jid: (crypto?.randomUUID ? crypto.randomUUID() : ("jid_"+Date.now()+"_"+Math.random())),
    action,
    payload,
    ts: Date.now()
  });
  _saveQueue(q);
  _emitSync({ syncing: _syncing, queued: q.length });
  processQueue().catch(()=>{});
}

async function processQueue(){
  if (_syncing) return;
  _syncing = true;
  _emitSync({ syncing: true, queued: queueSize() });

  try{
    while(true){
      const q = _loadQueue();
      if (!q.length) break;

      const job = q[0];
      const r = await apiJsonp(job.action, job.payload, { timeoutMs: 20000 });

      if (!r || !r.ok){
        // stop; keep queue; retry later
        throw new Error(r?.error || "Falha ao sincronizar");
      }

      // On any write success, drop caches that depend on it
      // (backend also caches; this keeps UI consistent)
      cacheDrop("today:");
      cacheDrop("lookups:");

      q.shift();
      _saveQueue(q);
      _emitSync({ syncing: true, queued: q.length });
    }
  } finally {
    _syncing = false;
    _emitSync({ syncing: false, queued: queueSize() });
  }
}

window.addEventListener("online", ()=> processQueue().catch(()=>{}));

/* =========================================================
   Convenience wrappers (keep your existing naming)
========================================================= */
function apiHealthz(){ return apiJsonp("healthz", {}); }
function apiVersion(){ return apiJsonp("version", {}); }

async function apiGetLookupsCached(){
  const k = "lookups:v1";
  const hit = cacheGet(k);
  if (hit) return hit;
  const r = await apiJsonp("getLookups", {});
  if (r && r.ok) cachePut(k, r, 30_000);
  return r;
}

async function apiGetTodayCached(dateIso = todayISO()){
  const k = "today:"+dateIso;
  const hit = cacheGet(k);
  if (hit) return hit;
  const r = await apiJsonp("getToday", { date: dateIso });
  if (r && r.ok) cachePut(k, r, 10_000);
  return r;
}

function qs(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function calcAgeFromBirth(birthIso){
  if (!birthIso) return "";
  const b = new Date(birthIso+"T00:00:00");
  const n = new Date();
  let years = n.getFullYear() - b.getFullYear();
  let months = n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) months--;
  if (months < 0){ years--; months += 12; }
  if (years < 0) return "";
  return `${years}a ${months}m`;
}

/* expose helpers you’ll use elsewhere */
window.CONFIG = CONFIG;
window.apiJsonp = apiJsonp;
window.enqueue = enqueue;
window.processQueue = processQueue;
window.queueSize = queueSize;
window.apiGetLookupsCached = apiGetLookupsCached;
window.apiGetTodayCached = apiGetTodayCached;
