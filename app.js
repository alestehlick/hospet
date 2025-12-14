/* =========================================================
   MVP — Hotel & Banho (NO LOGIN)
   Frontend: GitHub Pages
   Backend: Google Apps Script JSONP + Google Sheets
   ========================================================= */

const CONFIG = {
  // Paste your Apps Script Web App URL here:
  API_URL: "PASTE_YOUR_WEB_APP_URL_HERE",
};

const $ = (id) => document.getElementById(id);

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function formatDatePt(iso) {
  const d = new Date(iso + "T00:00:00");
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });
  const s = fmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function setAlert(msg) {
  $("alerts").innerHTML = `<div class="alert">${escapeHtml(msg)}</div>`;
}
function clearAlert(){ $("alerts").innerHTML = ""; }

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}

function formatMoney(n){
  const v = Number(n || 0);
  return v.toFixed(2).replace(".", ",");
}

function jsonp(action, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.API_URL || CONFIG.API_URL.includes("PASTE_YOUR")) {
      reject(new Error("You must set CONFIG.API_URL in app.js (Apps Script Web App URL)."));
      return;
    }

    const cbName = "cb_" + Math.random().toString(36).slice(2);
    window[cbName] = (resp) => { cleanup(); resolve(resp); };

    const dataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", cbName);
    url.searchParams.set("data", dataB64);

    const script = document.createElement("script");
    script.src = url.toString();
    script.async = true;
    script.onerror = () => { cleanup(); reject(new Error("JSONP request failed (network / CORS / deploy).")); };
    document.body.appendChild(script);

    function cleanup(){
      try { delete window[cbName]; } catch {}
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }
  });
}

function openDialog(id){ $(id).showModal(); }
function closeDialog(id){ $(id).close(); }

function labelTipoServico(type){
  const map = {
    creche: "Creche",
    diaria: "Diária (hotel)",
    banho: "Banho",
    tosa_higienica: "Tosa higiênica",
    transporte: "Transporte",
    outro: "Outro",
  };
  return map[type] || type;
}

function eventBgClass(ev){
  if (ev.kind === "task") {
    if (ev.operStatus === "concluido") return "bg-okTask stripe";
    return "bg-taskOpen stripe";
  }
  if (ev.operStatus === "concluido") return "bg-ok";

  switch(ev.type){
    case "banho": return "bg-bathOpen";
    case "tosa_higienica": return "bg-hygOpen";
    case "transporte": return "bg-transOpen";
    case "diaria": return "bg-hotelOpen";
    case "creche": return "bg-daycareOpen";
    case "outro": return "bg-otherOpen";
    default: return "bg-otherOpen";
  }
}

function renderEvents(list){
  const root = $("eventsList");
  root.innerHTML = "";

  if (!list.length){
    root.innerHTML = `<div class="event"><div class="event__title">Nenhum evento para hoje.</div></div>`;
    return;
  }

  for (const ev of list){
    const bg = eventBgClass(ev);
    const time = ev.startTime ? `${ev.startTime}${ev.endTime ? "–"+ev.endTime : ""}` : "";
    const title = ev.kind === "task"
      ? ev.title
      : `${labelTipoServico(ev.type)} — ${ev.dogName || "Cachorro"}`;

    const meta = ev.kind === "task"
      ? `${ev.date}${ev.time ? " • "+ev.time : ""}`
      : `${ev.date}${time ? " • "+time : ""}${ev.customerName ? " • "+ev.customerName : ""}`;

    const statusTxt = ev.operStatus === "concluido" ? "Concluído" : "Em aberto";
    const finTxt = ev.kind === "service"
      ? `Financeiro: ${ev.finStatus || "não faturado"} / ${ev.payStatus || "não pago"}`
      : "";

    const el = document.createElement("div");
    el.className = `event ${bg}`;
    el.innerHTML = `
      <button class="iconX" title="Excluir" aria-label="Excluir">×</button>
      <div class="event__top">
        <div>
          <div class="event__title">${escapeHtml(title)}</div>
          <div class="event__meta">${escapeHtml(meta)}</div>
          <div class="event__badges">
            <span class="badge">${escapeHtml(statusTxt)}</span>
            ${ev.kind === "service" ? `<span class="badge">R$ ${formatMoney(ev.price || 0)}</span>` : ""}
            ${ev.kind === "service" ? `<span class="badge">${escapeHtml(finTxt)}</span>` : ""}
          </div>
        </div>
      </div>
      <div class="event__actions">
        <button class="btn btn--ghost btnToggle">${ev.operStatus === "concluido" ? "Reabrir" : "Marcar como concluído"}</button>
      </div>
    `;

    el.querySelector(".iconX").addEventListener("click", async () => {
      if (!confirm("Excluir este evento?")) return;
      try {
        const r = await jsonp("deleteEvent", { id: ev.id, kind: ev.kind });
        if (r.ok === false) throw new Error(r.error || "Delete failed.");
        await loadToday();
      } catch (err) {
        alert(err.message || String(err));
      }
    });

    el.querySelector(".btnToggle").addEventListener("click", async () => {
      const next = ev.operStatus === "concluido" ? "aberto" : "concluido";
      try {
        const r = await jsonp("setEventStatus", { id: ev.id, kind: ev.kind, operStatus: next });
        if (r.ok === false) throw new Error(r.error || "Update failed.");
        await loadToday();
      } catch (err) {
        alert(err.message || String(err));
      }
    });

    root.appendChild(el);
  }
}

function defaultPriceFor(type){
  const map = { creche: 120, diaria: 180, banho: 120, tosa_higienica: 60, transporte: 40, outro: 0 };
  return map[type] ?? 0;
}

async function loadLookups(){
  const r = await jsonp("getLookups", {});
  if (r.ok === false) throw new Error(r.error || "Failed to load lookups.");

  fillSelectDogs(r.dogs || []);
  fillSelectCustomers(r.customers || []);
}

function fillSelectDogs(dogs){
  const sel = $("svcDog");
  sel.innerHTML = "";
  for (const d of dogs){
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name + (d.customerName ?
