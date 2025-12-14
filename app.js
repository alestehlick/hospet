/* =========================================================
   MVP — Hotel & Banho
   Frontend no GitHub Pages + API JSONP no Google Apps Script
   ========================================================= */

const CONFIG = {
  // Cole aqui a URL do Web App do Apps Script (deploy)
  API_URL: "https://script.google.com/macros/s/AKfycbzOY4pOx2Cvjjp3lwCczoPBhdt8ZZClwQYMayajbZDCTuzLnGX7E1RkC7_y2hqOvaGp/exec",
  // Chave simples (provisória). Deve bater com a do Apps Script.
  ADMIN_KEY: localStorage.getItem("ADMIN_KEY") || "",
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
  // capitaliza primeira letra
  const s = fmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function jsonp(action, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.API_URL || CONFIG.API_URL.includes("COLE_AQUI")) {
      reject(new Error("Configure CONFIG.API_URL em app.js com a URL do Web App do Apps Script."));
      return;
    }

    const cbName = "cb_" + Math.random().toString(36).slice(2);
    window[cbName] = (resp) => {
      cleanup();
      resolve(resp);
    };

    const dataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("key", CONFIG.ADMIN_KEY);
    url.searchParams.set("callback", cbName);
    url.searchParams.set("data", dataB64);

    const script = document.createElement("script");
    script.src = url.toString();
    script.async = true;
    script.onerror = () => { cleanup(); reject(new Error("Falha na chamada JSONP.")); };
    document.body.appendChild(script);

    function cleanup(){
      try { delete window[cbName]; } catch {}
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }
  });
}

function setAlert(msg) {
  const box = $("alerts");
  box.innerHTML = `<div class="alert">${msg}</div>`;
}
function clearAlert(){ $("alerts").innerHTML = ""; }

function eventBgClass(ev){
  // ev.kind: "service" | "task"
  // ev.operStatus: "aberto" | "concluido"
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
      : `${ev.date}${time ? " • "+time : ""} • ${ev.customerName ? ev.customerName : ""}`.trim();

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
      const ok = confirm("Excluir este evento?");
      if (!ok) return;
      await jsonp("deleteEvent", { id: ev.id, kind: ev.kind });
      await loadToday();
    });

    el.querySelector(".btnToggle").addEventListener("click", async () => {
      const next = ev.operStatus === "concluido" ? "aberto" : "concluido";
      await jsonp("setEventStatus", { id: ev.id, kind: ev.kind, operStatus: next });
      await loadToday();
    });

    root.appendChild(el);
  }
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}

function formatMoney(n){
  const v = Number(n || 0);
  return v.toFixed(2).replace(".", ",");
}

// ================== Carregamentos ==================
async function loadLookups(){
  const data = await jsonp("getLookups", {});
  window.__LOOKUPS = data;
  fillSelectDogs(data.dogs || []);
  fillSelectCustomers(data.customers || []);
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
  const sel2 = $("dogCustomer");
  $("dogCustomer").innerHTML = "";
  for (const c of customers){
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    $("dogCustomer").appendChild(opt);
  }
  // também para modal novo cachorro já cobre.
  const custSel = $("dogCustomer");
  if (custSel && custSel.options.length) custSel.value = custSel.options[0].value;
}

async function loadToday(){
  clearAlert();
  const date = todayISO();
  $("todayTitle").textContent = `Hoje — ${formatDatePt(date)}`;

  const resp = await jsonp("getToday", { date });
  if (resp.ok === false){
    setAlert(resp.error || "Erro ao carregar.");
    return;
  }
  renderEvents(resp.events || []);
}

// ================== UI / Eventos ==================
function openDialog(id){ $(id).showModal(); }
function closeDialog(id){ $(id).close(); }

function defaultPriceFor(type){
  // você pode ajustar depois no “Config”/tabela
  const map = { creche: 120, diaria: 180, banho: 120, tosa_higienica: 60, transporte: 40, outro: 0 };
  return map[type] ?? 0;
}

function wireUI(){
  $("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("ADMIN_KEY");
    CONFIG.ADMIN_KEY = "";
    $("loginDialog").showModal();
  });

  $("btnRefresh").addEventListener("click", loadToday);

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
    await jsonp("addService", payload);
    closeDialog("serviceDialog");
    await loadToday();
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
    await jsonp("addTask", payload);
    closeDialog("taskDialog");
    await loadToday();
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
    await jsonp("addCustomer", payload);
    closeDialog("customerDialog");
    await loadLookups();
    await loadToday();
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
    await jsonp("addDog", payload);
    closeDialog("dogDialog");
    await loadLookups();
    await loadToday();
  });

  $("searchBtn").addEventListener("click", runSearch);
  $("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });

  $("btnEventLog").addEventListener("click", async () => {
    const q = prompt("Log de eventos — digite uma data (YYYY-MM-DD) ou deixe vazio para hoje:", todayISO());
    const date = (q && q.trim()) ? q.trim() : todayISO();
    const resp = await jsonp("getToday", { date });
    alert(`Eventos em ${date}: ${resp.events?.length || 0}\n(Em breve: tela dedicada de log)`);
  });

  // Login
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = $("adminKeyInput").value.trim();
    if (!key) { alert("Digite a chave."); return; }
    // test
    CONFIG.ADMIN_KEY = key;
    localStorage.setItem("ADMIN_KEY", key);

    const ping = await jsonp("ping", {});
    if (ping.ok === false){
      alert("Chave inválida ou API indisponível.");
      localStorage.removeItem("ADMIN_KEY");
      CONFIG.ADMIN_KEY = "";
      return;
    }
    $("loginDialog").close();
    await boot();
  });
}

async function runSearch(){
  const q = $("searchInput").value.trim();
  if (!q) return;
  const resp = await jsonp("search", { q });
  const dogs = resp.dogs || [];
  const customers = resp.customers || [];
  const lines = [];
  if (dogs.length) lines.push("Cachorros:\n" + dogs.map(d => `• ${d.name} (Tutor: ${d.customerName || "-"})`).join("\n"));
  if (customers.length) lines.push("Clientes:\n" + customers.map(c => `• ${c.name} (${c.whatsapp || "-"})`).join("\n"));
  alert(lines.length ? lines.join("\n\n") : "Nada encontrado.");
}

// ================== Boot ==================
async function boot(){
  try{
    await loadLookups();
    await loadToday();
  }catch(err){
    console.error(err);
    setAlert(err.message || "Erro inesperado.");
  }
}

(function init(){
  wireUI();
  // se já tem chave salva, tenta abrir direto
  if (CONFIG.ADMIN_KEY){
    $("loginDialog").close();
    boot();
  } else {
    $("adminKeyInput").value = "";
    $("loginDialog").showModal();
  }
})();

