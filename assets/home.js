/* =========================================================
   Home (Agenda)
   ========================================================= */

let _searchTimer = null;

function setApiStatus(msg){
  $("apiStatus").textContent = msg || "";
}

function defaultPrice(type){
  const map = { creche:120, diaria:180, banho:120, tosa_higienica:60, transporte:40, outro:0 };
  return map[type] ?? 0;
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
      ? `${ev.date || ""}${ev.time ? " • "+ev.time : ""}`
      : `${ev.date || ""}${time ? " • "+time : ""}${ev.customerName ? " • "+ev.customerName : ""}${ev.source==="regular" ? " • Regular" : ""}`;

    const statusTxt = ev.operStatus === "concluido" ? "Concluído" : "Em aberto";

    const el = document.createElement("div");
    el.className = `event ${bg}`;
    el.innerHTML = `
      <button class="iconX" title="Excluir" aria-label="Excluir">×</button>
      <div class="event__title">${escapeHtml(title)}</div>
      <div class="event__meta">${escapeHtml(meta)}</div>
      <div class="event__badges">
        <span class="badge">${escapeHtml(statusTxt)}</span>
        ${ev.kind === "service" ? `<span class="badge">R$ ${formatMoney(ev.price || 0)}</span>` : ""}
      </div>
      <div class="event__actions">
        <button class="btn btn--ghost btnToggle">${ev.operStatus === "concluido" ? "Reabrir" : "Marcar como concluído"}</button>
      </div>
    `;

    el.querySelector(".iconX").addEventListener("click", async ()=>{
      if (!confirm("Excluir este evento?")) return;
      const r = await apiJsonp("deleteEvent", { id: ev.id, kind: ev.kind });
      if (!r.ok) return alert(r.error || "Falha ao excluir.");
      await loadToday();
    });

    el.querySelector(".btnToggle").addEventListener("click", async ()=>{
      const next = ev.operStatus === "concluido" ? "aberto" : "concluido";
      const r = await apiJsonp("setEventStatus", { id: ev.id, kind: ev.kind, operStatus: next });
      if (!r.ok) return alert(r.error || "Falha ao atualizar.");
      await loadToday();
    });

    root.appendChild(el);
  }
}

/* ---------- Lookups ---------- */
async function loadLookups(){
  const r = await apiJsonp("getLookups", {});
  if (!r.ok) throw new Error(r.error || "Falha ao carregar listas.");

  const dogs = r.dogs || [];
  const customers = r.customers || [];

  // service dog select
  const selDog = $("svcDog");
  selDog.innerHTML = "";
  dogs.forEach(d=>{
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name + (d.customerName ? ` (Tutor: ${d.customerName})` : "");
    selDog.appendChild(opt);
  });

  // dog customer select
  const selCust = $("dogCustomer");
  selCust.innerHTML = "";
  customers.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    selCust.appendChild(opt);
  });
}

/* ---------- Today ---------- */
async function loadToday(){
  const date = todayISO();
  $("todayTitle").textContent = `Hoje — ${formatDatePt(date)}`;

  const r = await apiJsonp("getToday", { date });
  if (!r.ok) throw new Error(r.error || "Falha ao carregar agenda.");
  renderEvents(r.events || []);
}

/* ---------- Autocomplete ---------- */
function hideSuggest(){
  const box = $("searchSuggest");
  box.hidden = true;
  box.innerHTML = "";
}

function showSuggest(items){
  const box = $("searchSuggest");
  if (!items.length){ hideSuggest(); return; }
  box.hidden = false;
  box.innerHTML = items.map(it => `
    <div class="row" data-kind="${it.kind}" data-id="${it.id}">
      <div>
        <div class="name">${escapeHtml(it.name)}</div>
        <div class="meta">${escapeHtml(it.meta || "")}</div>
      </div>
      <div class="kind">${escapeHtml(it.kindLabel)}</div>
    </div>
  `).join("");

  box.querySelectorAll(".row").forEach(row=>{
    row.addEventListener("click", ()=>{
      const kind = row.getAttribute("data-kind");
      const id = row.getAttribute("data-id");
      hideSuggest();
      if (kind === "dog") window.open(`dog.html?id=${encodeURIComponent(id)}`, "_blank");
      if (kind === "customer") window.open(`customer.html?id=${encodeURIComponent(id)}`, "_blank");
    });
  });
}

async function refreshSuggest(){
  const q = $("searchInput").value.trim();
  if (q.length < 2){ hideSuggest(); return; }

  const r = await apiJsonp("search", { q });
  if (!r.ok) throw new Error(r.error || "Falha na busca.");

  const dogs = (r.dogs || []).slice(0,8).map(d => ({
    kind:"dog", kindLabel:"Cachorro",
    id:d.id, name:d.name,
    meta: d.customerName ? `Tutor: ${d.customerName}` : ""
  }));

  const customers = (r.customers || []).slice(0,8).map(c => ({
    kind:"customer", kindLabel:"Cliente",
    id:c.id, name:c.name,
    meta: c.whatsapp ? `WhatsApp: ${c.whatsapp}` : ""
  }));

  showSuggest([...dogs, ...customers]);
}

async function runSearch(){
  const q = $("searchInput").value.trim();
  if (!q) return;
  const r = await apiJsonp("search", { q });
  if (!r.ok) return alert(r.error || "Falha na busca.");

  const dogs = r.dogs || [];
  const customers = r.customers || [];
  if (dogs.length === 1 && customers.length === 0){
    window.open(`dog.html?id=${encodeURIComponent(dogs[0].id)}`, "_blank");
    return;
  }
  if (customers.length === 1 && dogs.length === 0){
    window.open(`customer.html?id=${encodeURIComponent(customers[0].id)}`, "_blank");
    return;
  }
  alert("Use as sugestões da busca para abrir a ficha.");
}

/* ---------- Weekdays UI ---------- */
function renderWeekdays(containerId, group){
  const root = $(containerId);
  root.className = "weekdays";
  const days = [
    {n:1, t:"Seg"}, {n:2, t:"Ter"}, {n:3, t:"Qua"},
    {n:4, t:"Qui"}, {n:5, t:"Sex"}, {n:6, t:"Sáb"}, {n:7, t:"Dom"},
  ];
  root.innerHTML = days.map(d => `
    <label><input type="checkbox" data-wd="${d.n}" data-group="${group}"/> ${d.t}</label>
  `).join("");
}

function getSelectedWeekdays(group){
  const boxes = document.querySelectorAll(`input[type="checkbox"][data-group="${group}"]`);
  const nums = [];
  boxes.forEach(b=>{ if (b.checked) nums.push(Number(b.getAttribute("data-wd"))); });
  return nums.join(",");
}

function clearWeekdays(group){
  document.querySelectorAll(`input[type="checkbox"][data-group="${group}"]`).forEach(b=> b.checked = false);
}

/* ---------- Dialog helpers ---------- */
function openDialog(id){ $(id).showModal(); }
function closeDialog(id){ $(id).close(); }

/* ---------- Wiring ---------- */
function wire(){
  // cancel
  document.querySelectorAll(".btnCancel").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const dlg = btn.closest("dialog");
      if (dlg) dlg.close();
    });
  });

  // init weekday widgets
  renderWeekdays("rgCrecheDays", "creche");
  renderWeekdays("rgTransDays", "transporte");

  // autocomplete events
  document.addEventListener("click", (e)=>{
    if (!e.target.closest(".searchWrap")) hideSuggest();
  });

  $("searchInput").addEventListener("input", ()=>{
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(()=>{ refreshSuggest().catch(()=>{}); }, 180);
  });

  $("searchInput").addEventListener("keydown", (e)=>{
    if (e.key === "Escape") hideSuggest();
    if (e.key === "Enter") runSearch().catch(()=>{});
  });

  $("searchBtn").addEventListener("click", ()=> runSearch().catch(()=>{}));

  $("btnRefresh").addEventListener("click", ()=> boot());

$("btnGenerate").addEventListener("click", async ()=>{
  try{
    const startDate = todayISO();
    const days = 14;

    // backend action names are normalized, but use the backend's canonical name
    const r = await apiJsonp("generatefromregular", { startDate, days });

    if (!r.ok) throw new Error(r.error || "Falha ao gerar agenda.");

    // backend returns startDate + days (NOT r.window)
    const end = new Date(startDate + "T00:00:00");
    end.setDate(end.getDate() + (Number(r.days || days) - 1));
    const endIso = end.toISOString().slice(0,10);

    alert(`Agenda gerada: ${r.created || 0} serviços (${r.startDate || startDate} → ${endIso})`);
    await loadToday();
  }catch(err){
    alert(err.message || String(err));
  }
});


  $("serviceForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = {
      type: $("svcType").value,
      date: $("svcDate").value,
      startTime: $("svcStart").value,
      endTime: $("svcEnd").value,
      price: Number($("svcPrice").value || 0),
      dogId: $("svcDog").value,
      notes: $("svcNotes").value,
      source: "manual",
    };
    if (!payload.date || !payload.dogId) return alert("Preencha data e cachorro.");
    const r = await apiJsonp("addService", payload);
    if (!r.ok) return alert(r.error || "Falha ao salvar serviço.");
    closeDialog("serviceDialog");
    await loadToday();
  });

  $("btnNewTask").addEventListener("click", ()=>{
    $("taskTitle").value = "";
    $("taskDate").value = todayISO();
    $("taskTime").value = "";
    $("taskDesc").value = "";
    openDialog("taskDialog");
  });

  $("taskForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = {
      title: $("taskTitle").value.trim(),
      date: $("taskDate").value,
      time: $("taskTime").value,
      desc: $("taskDesc").value,
    };
    if (!payload.title) return alert("Título é obrigatório.");
    const r = await apiJsonp("addTask", payload);
    if (!r.ok) return alert(r.error || "Falha ao salvar tarefa.");
    closeDialog("taskDialog");
    await loadToday();
  });

  $("btnNewCustomer").addEventListener("click", ()=>{
    $("custName").value = "";
    $("custWhatsapp").value = "";
    $("custEmail").value = "";
    $("custAddress").value = "";
    $("custCreditCreche").value = 0;
    $("custCreditTransp").value = 0;
    $("custCreditBanho").value = 0;
    openDialog("customerDialog");
  });

  $("customerForm").addEventListener("submit", async (e)=>{
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
    if (!payload.name) return alert("Nome é obrigatório.");
    const r = await apiJsonp("addCustomer", payload);
    if (!r.ok) return alert(r.error || "Falha ao salvar cliente.");
    closeDialog("customerDialog");
    await loadLookups();
  });

  $("btnNewDog").addEventListener("click", ()=>{
    $("dogName").value = "";
    $("dogBreed").value = "";
    $("dogBirthDate").value = "";
    $("dogAgeDisplay").value = "";
    $("dogPhotoUrl").value = "";
    $("dogDiet").value = "";
    $("dogTemper").value = "";
    $("dogVaccines").value = "";
    $("dogHealth").value = "";
    $("dogNotes").value = "";
    clearWeekdays("creche");
    clearWeekdays("transporte");
    openDialog("dogDialog");
  });

  $("dogBirthDate").addEventListener("change", ()=>{
    $("dogAgeDisplay").value = calcAgeFromBirth($("dogBirthDate").value);
  });

  $("dogForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = {
      name: $("dogName").value.trim(),
      breed: $("dogBreed").value.trim(),
      birthDate: $("dogBirthDate").value,
      customerId: $("dogCustomer").value,
      photoUrl: $("dogPhotoUrl").value.trim(),
      diet: $("dogDiet").value,
      temperament: $("dogTemper").value,
      vaccines: $("dogVaccines").value,
      health: $("dogHealth").value,
      notes: $("dogNotes").value,
    };
    if (!payload.name || !payload.customerId) return alert("Nome e cliente são obrigatórios.");

    const r = await apiJsonp("addDog", payload);
    if (!r.ok) return alert(r.error || "Falha ao salvar cachorro.");

    const dogId = r.id;

    // Regular services if selected
    const crecheW = getSelectedWeekdays("creche");
    if (crecheW){
      const rr = await apiJsonp("addRegularService", {
        dogId,
        type: "creche",
        weekdays: crecheW,
        startTime: "",
        endTime: "",
        price: defaultPrice("creche"),
        notes: "Regular (criado no cadastro)"
      });
      if (!rr.ok) return alert(rr.error || "Falha ao salvar regular (creche).");
    }

    const transW = getSelectedWeekdays("transporte");
    if (transW){
      const rr = await apiJsonp("addRegularService", {
        dogId,
        type: "transporte",
        weekdays: transW,
        startTime: "",
        endTime: "",
        price: defaultPrice("transporte"),
        notes: "Regular (criado no cadastro)"
      });
      if (!rr.ok) return alert(rr.error || "Falha ao salvar regular (transporte).");
    }

    closeDialog("dogDialog");
    await loadLookups();
    await loadToday();
  });
}

async function boot(){
  try{
    setApiStatus("Conectando…");
    const ping = await apiJsonp("ping", {});
    if (!ping.ok) throw new Error(ping.error || "API offline.");
    setApiStatus("API OK");

    await loadLookups();
    await loadToday();
  }catch(err){
    console.error(err);
    setApiStatus("API com erro");
    alert(err.message || String(err));
  }
}

(function init(){
  wire();
  boot();
})();
