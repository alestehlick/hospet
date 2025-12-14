/* =========================================================
   Shared Frontend Helpers (JSONP)
   ========================================================= */

const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbyd3wrjqMu53DzW4ov7Byt64vQOb2R2YL8I_l8-mGR_stbHE5Qi0ZiehYzm6iGZtf-52A/exec",
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

function apiJsonp(action, payload = {}){
  return new Promise((resolve, reject)=>{
    if (!CONFIG.API_URL) return reject(new Error("CONFIG.API_URL não configurado."));

    const cb = "cb_" + Math.random().toString(36).slice(2);
    window[cb] = (resp)=>{ cleanup(); resolve(resp); };

    // base64 payload
    const dataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

    const url = new URL(CONFIG.API_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", cb);
    url.searchParams.set("data", dataB64);

    // IMPORTANT: cache buster (prevents cached JSONP responses)
    url.searchParams.set("_", Date.now().toString());

    const script = document.createElement("script");
    script.src = url.toString();
    script.async = true;
    script.onerror = ()=>{ cleanup(); reject(new Error("JSONP request failed (deploy / network).")); };
    document.body.appendChild(script);

    function cleanup(){
      try{ delete window[cb]; }catch(_){}
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }
  });
}

// Optional: health check helper (works because backend now supports JSONP for healthz)
function apiHealthz(){
  return apiJsonp("healthz", {});
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
