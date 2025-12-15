/* =========================================================
   Shared Frontend Helpers (JSONP) + Speed Optimizations
   - single source of config (window.CONFIG preferred)
   - robust global helpers ($, escapeHtml, etc.)
   - local write queue (write-behind) + small memory cache
   ========================================================= */

(function () {
  // ---- Robust config (prefer config.js if present) ----
  const FALLBACK_API_URL =
    "https://script.google.com/macros/s/AKfycbxWN-dz9zvcI0sxYuNT0mFAmn3kSR0kGTTzD2THneTlfsVgD1uTjC8SMneffSOZPyVqlw/exec";

  const CONFIG = Object.assign({}, window.CONFIG || {});
  if (!CONFIG.API_URL) CONFIG.API_URL = FALLBACK_API_URL;
  window.CONFIG = CONFIG;

  // ---- DOM helpers ----
  function $(id) {
    return document.getElementById(id);
  }
  window.$ = $;

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }
  window.escapeHtml = escapeHtml;

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  window.todayISO = todayISO;

  function formatDatePt(iso) {
    const d = new Date(iso + "T00:00:00");
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const s = fmt.format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  window.formatDatePt = formatDatePt;

  function formatMoney(n) {
    const v = Number(n || 0);
    return v.toFixed(2).replace(".", ",");
  }
  window.formatMoney = formatMoney;

  // UTF-8 safe base64
  function b64utf8(obj) {
    const json = JSON.stringify(obj ?? {});
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function apiJsonp(action, payload = {}, { timeoutMs = 15000 } = {}) {
    return new Promise((resolve, reject) => {
      if (!CONFIG.API_URL) return reject(new Error("CONFIG.API_URL não configurado."));

      const cb = "cb_" + Math.random().toString(36).slice(2);
      let finished = false;

      window[cb] = (resp) => {
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

      const t = setTimeout(() => {
        if (finished) return;
        cleanup();
        reject(new Error("JSONP timeout."));
      }, timeoutMs);

      script.onerror = () => {
        if (finished) return;
        cleanup();
        reject(new Error("JSONP request failed (deploy / network)."));
      };

      // If body doesn't exist for some reason, use head as fallback.
      (document.body || document.head || document.documentElement).appendChild(script);

      function cleanup() {
        clearTimeout(t);
        try { delete window[cb]; } catch (_) {}
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }
    });
  }
  window.apiJsonp = apiJsonp;

  /* =========================================================
     Small frontend cache
  ========================================================= */
  const _memCache = new Map();
  function cacheGet(key) {
    const it = _memCache.get(key);
    if (!it) return null;
    if (Date.now() > it.exp) { _memCache.delete(key); return null; }
    return it.value;
  }
  function cachePut(key, value, ttlMs) {
    _memCache.set(key, { exp: Date.now() + ttlMs, value });
  }
  function cacheDrop(prefix) {
    for (const k of _memCache.keys()) {
      if (String(k).startsWith(prefix)) _memCache.delete(k);
    }
  }

  /* =========================================================
     Local write queue (write-behind)
  ========================================================= */
  const SYNC_KEY = "hb_sync_queue_v1";
  let _syncing = false;

  function _loadQueue() {
    try { return JSON.parse(localStorage.getItem(SYNC_KEY) || "[]"); }
    catch { return []; }
  }
  function _saveQueue(q) {
    localStorage.setItem(SYNC_KEY, JSON.stringify(q));
  }
  function queueSize() {
    return _loadQueue().length;
  }
  window.queueSize = queueSize;

  function _emitSync(status) {
    window.dispatchEvent(new CustomEvent("hb:sync", { detail: status }));
  }

  function enqueue(action, payload) {
    const q = _loadQueue();
    q.push({
      jid: (crypto?.randomUUID ? crypto.randomUUID() : ("jid_" + Date.now() + "_" + Math.random())),
      action,
      payload,
      ts: Date.now(),
    });
    _saveQueue(q);
    _emitSync({ syncing: _syncing, queued: q.length });
    processQueue().catch(() => {});
  }
  window.enqueue = enqueue;

  async function processQueue() {
    if (_syncing) return;
    _syncing = true;
    _emitSync({ syncing: true, queued: queueSize() });

    try {
      while (true) {
        const q = _loadQueue();
        if (!q.length) break;

        const job = q[0];
        const r = await apiJsonp(job.action, job.payload, { timeoutMs: 20000 });

        if (!r || !r.ok) {
          throw new Error(r?.error || "Falha ao sincronizar");
        }

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
  window.processQueue = processQueue;

  window.addEventListener("online", () => processQueue().catch(() => {}));

  /* =========================================================
     Cached API helpers
  ========================================================= */
  async function apiGetLookupsCached() {
    const k = "lookups:v1";
    const hit = cacheGet(k);
    if (hit) return hit;
    const r = await apiJsonp("getLookups", {});
    if (r && r.ok) cachePut(k, r, 30_000);
    return r;
  }
  window.apiGetLookupsCached = apiGetLookupsCached;

  async function apiGetTodayCached(dateIso = todayISO()) {
    const k = "today:" + dateIso;
    const hit = cacheGet(k);
    if (hit) return hit;
    const r = await apiJsonp("getToday", { date: dateIso });
    if (r && r.ok) cachePut(k, r, 10_000);
    return r;
  }
  window.apiGetTodayCached = apiGetTodayCached;

  function qs(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  }
  window.qs = qs;

  function calcAgeFromBirth(birthIso) {
    if (!birthIso) return "";
    const b = new Date(birthIso + "T00:00:00");
    const n = new Date();
    let years = n.getFullYear() - b.getFullYear();
    let months = n.getMonth() - b.getMonth();
    if (n.getDate() < b.getDate()) months--;
    if (months < 0) { years--; months += 12; }
    if (years < 0) return "";
    return `${years}a ${months}m`;
  }
  window.calcAgeFromBirth = calcAgeFromBirth;
})();
