function apiJsonp(action, payload = {}, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const API_URL = window.CONFIG?.API_URL;
    if (!API_URL) return reject(new Error("CONFIG.API_URL não configurado."));

    const cbName = "cb_" + Math.random().toString(36).slice(2);
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("Tempo esgotado (JSONP). Verifique a URL /exec e o deploy."));
    }, timeoutMs);

    window[cbName] = (resp) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      resolve(resp);
    };

    const dataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url = new URL(API_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", cbName);
    url.searchParams.set("data", dataB64);

    const script = document.createElement("script");
    script.src = url.toString();
    script.async = true;
    script.onerror = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error("Falha ao carregar JSONP (rede/URL/deploy)."));
    };

    document.body.appendChild(script);

    function cleanup() {
      try { delete window[cbName]; } catch {}
      if (script.parentNode) script.parentNode.removeChild(script);
    }
  });
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function formatDatePt(iso) {
  const d = new Date(iso + "T00:00:00");
  const fmt = new Intl.DateTimeFormat("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
  const s = fmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}

function moneyBR(n){
  const v = Number(n||0);
  return "R$ " + v.toFixed(2).replace(".", ",");
}

