/* =========================================================
   Shared Frontend Helpers (JSONP)
   ========================================================= */

const CONFIG = {
  // MUST be the SAME deployment as the backend code above
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

// UTF-8 safe base64 (no unescape/encodeURIComponent issues)
function b64utf8(obj){
  const json = JSON.stringify(obj ?? {});
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

function apiJsonp(action, payload = {}){
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
    url.searchParams.set("_", Date.now().toString()); // cache buster

    const script = document.createElement("script");
    script.src = url.toString();
    script.async = true;

    const t = setTimeout(()=>{
      if (finished) return;
      cleanup();
      reject(new Error("JSONP timeout."));
    }, 15000);

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

// Convenience wrappers that MATCH backend payload keys exactly:
function apiHealthz(){ return apiJsonp("healthz", {}); }
function apiVersion(){ return apiJsonp("version", {}); }
function apiGetToday(dateIso = todayISO()){ return apiJsonp("gettoday", { date: dateIso }); }
function apiGenerateAgenda(startDate = todayISO(), days = 7){
  return apiJsonp("generatefromregular", { startDate, days });
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
