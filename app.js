/* =========================================================
   MVP — Hotel & Banho (NO LOGIN)
   Frontend: GitHub Pages
   Backend: Google Apps Script JSONP + Google Sheets
   ========================================================= */

const CONFIG = {
  // Paste your Apps Script Web App URL here:
  API_URL: "https://script.google.com/macros/s/AKfycbysKmdf8xdb3xeQitWX4bZmJ6LNjhJb-V-xkQLjgmlN4wEbpTL1ZuGK2vuScMYXieneVA/exec",
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
    opt.textContent = d.name + (d.customerName ? ` (Tutor: ${d.customerName})` : "");
    sel.appendChild(opt);
  }
}

function fillSelectCustomers(customers){
  const sel = $("dogCustomer");
  sel.innerHTML = "";
  for (const c of customers){
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  }
}

async function loadToday(){
  clearAlert();
  const date = todayISO();
  $("todayTitle").textContent = `Hoje — ${formatDatePt(date)}`;

  const r = await jsonp("getToday", { date });
  if (r.ok === false) throw new Error(r.error || "Failed to load today.");
  renderEvents(r.events || []);
}

async function runSearch(){
  const q = $("searchInput").value.trim();
  if (!q) return;
  const r = await jsonp("search", { q });
  if (r.ok === false) throw new Error(r.error || "Search failed.");

  const dogs = r.dogs || [];
  const customers = r.customers || [];
  const lines = [];
  if (dogs.length) lines.push("Cachorros:\n" + dogs.map(d => `• ${d.name} (Tutor: ${d.customerName || "-"})`).join("\n"));
  if (customers.length) lines.push("Clientes:\n" + customers.map(c => `• ${c.name} (${c.whatsapp || "-"})`).join("\n"));
  alert(lines.length ? lines.join("\n\n") : "Nada encontrado.");
}

function wireUI(){
  // Cancel buttons close dialogs
  document.querySelectorAll(".btnCancel").forEach(btn => {
    btn.addEventListener("click", () => {
      const dlg = btn.closest("dialog");
      if (dlg) dlg.close();
    });
  });

  $("btnRefresh").addEventListener("click", () => boot());

  $("btnNewService").addEventListener("click", () => {
    $("svcType").value = "creche";
    $("svcDate").value = todayISO();
    $("svcStart").value = "";
    $("svcEnd").value = "";
    $("svcPrice").value = defaultPriceFor("creche");
    $("svcNotes").value = "";
    openDialog("serviceDialog");
  });

  $("svcType").addEventListener("change", () => {
    $("svcPrice").value = defaultPriceFor($("svcType").value);
  });

  $("serviceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      type: $("svcType").value,
      date: $("svcDate").value,
      startTime: $("svcStart").value,
      endTime: $("svcEnd").value,
      price: Number($("svcPrice").value || 0),
      dogId: $("svcDog").value,
      notes: $("svcNotes").value,
    };
    if (!payload.date || !payload.dogId) { alert("Preencha data e cachorro."); return; }

    try{
      const r = await jsonp("addService", payload);
      if (r.ok === false) throw new Error(r.error || "Failed to save service.");
      closeDialog("serviceDialog");
      await loadToday();
    }catch(err){
      alert(err.message || String(err));
    }
  });

  $("btnNewTask").addEventListener("click", () => {
    $("taskTitle").value = "";
    $("taskDate").value = todayISO();
    $("taskTime").value = "";
    $("taskDesc").value = "";
    openDialog("taskDialog");
  });

  $("taskForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      title: $("taskTitle").value.trim(),
      date: $("taskDate").value,
      time: $("taskTime").value,
      desc: $("taskDesc").value,
    };
    if (!payload.title) { alert("Título é obrigatório."); return; }

    try{
      const r = await jsonp("addTask", payload);
      if (r.ok === false) throw new Error(r.error || "Failed to save task.");
      closeDialog("taskDialog");
      await loadToday();
    }catch(err){
      alert(err.message || String(err));
    }
  });

  $("btnNewCustomer").addEventListener("click", () => {
    $("custName").value = "";
    $("custWhatsapp").value = "";
    $("custEmail").value = "";
    $("custAddress").value = "";
    $("custCreditCreche").value = 0;
    $("custCreditTransp").value = 0;
    $("custCreditBanho").value = 0;
    openDialog("customerDialog");
  });

  $("customerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: $("custName").value.trim(),
      whatsapp: $("custWhatsapp").value.trim(),
      email: $("custEmail").value.trim(),
      address: $("custAddress").value.trim(),
      creditCreche: Number($("custCreditCreche").value || 0),
      creditTransp: Number($("custCreditTransp").value || 0),
      creditBanho: Number($("custCreditBanho").value || 0),
    };
    if (!payload.name) { alert("Nome é obrigatório."); return; }

    try{
      const r = await jsonp("addCustomer", payload);
      if (r.ok === false) throw new Error(r.error || "Failed to save customer.");
      closeDialog("customerDialog");
      await loadLookups();
      await loadToday();
    }catch(err){
      alert(err.message || String(err));
    }
  });

  $("btnNewDog").addEventListener("click", () => {
    $("dogName").value = "";
    $("dogBreed").value = "";
    $("dogAgeYears").value = 0;
    $("dogAgeMonths").value = 0;
    $("dogPhotoUrl").value = "";
    $("dogDiet").value = "";
    $("dogTemper").value = "";
    $("dogVaccines").value = "";
    $("dogHealth").value = "";
    $("dogNotes").value = "";
    openDialog("dogDialog");
  });

  $("dogForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: $("dogName").value.trim(),
      breed: $("dogBreed").value.trim(),
      ageYears: Number($("dogAgeYears").value || 0),
      ageMonths: Number($("dogAgeMonths").value || 0),
      customerId: $("dogCustomer").value,
      photoUrl: $("dogPhotoUrl").value.trim(),
      diet: $("dogDiet").value,
      temperament: $("dogTemper").value,
      vaccines: $("dogVaccines").value,
      health: $("dogHealth").value,
      notes: $("dogNotes").value,
    };
    if (!payload.name || !payload.customerId) { alert("Nome e cliente são obrigatórios."); return; }

    try{
      const r = await jsonp("addDog", payload);
      if (r.ok === false) throw new Error(r.error || "Failed to save dog.");
      closeDialog("dogDialog");
      await loadLookups();
      await loadToday();
    }catch(err){
      alert(err.message || String(err));
    }
  });

  $("searchBtn").addEventListener("click", async () => {
    try { await runSearch(); } catch (err) { alert(err.message || String(err)); }
  });
  $("searchInput").addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      try { await runSearch(); } catch (err) { alert(err.message || String(err)); }
    }
  });

  $("btnEventLog").addEventListener("click", async () => {
    const q = prompt("Log de eventos — digite uma data (YYYY-MM-DD) ou deixe vazio para hoje:", todayISO());
    const date = (q && q.trim()) ? q.trim() : todayISO();
    try{
      const r = await jsonp("getToday", { date });
      if (r.ok === false) throw new Error(r.error || "Failed.");
      alert(`Eventos em ${date}: ${r.events?.length || 0}\n(Em breve: tela de log)`);
    }catch(err){
      alert(err.message || String(err));
    }
  });
}

async function boot(){
  try{
    if (!CONFIG.API_URL || CONFIG.API_URL.includes("PASTE_YOUR")) {
      setAlert("Configure CONFIG.API_URL em app.js com a URL do Web App do Apps Script.");
      return;
    }
    await loadLookups();
    await loadToday();
  }catch(err){
    console.error(err);
    setAlert(err.message || String(err));
  }
}

(function init(){
  wireUI();
  boot();
})();
