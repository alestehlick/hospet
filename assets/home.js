const $ = (id) => document.getElementById(id);

function setAlert(msg){ $("alerts").innerHTML = `<div class="alert">${escapeHtml(msg)}</div>`; }
function clearAlert(){ $("alerts").innerHTML = ""; }

function labelTipo(type){
  return ({
    creche:"Creche",
    diaria:"Diária (hotel)",
    banho:"Banho",
    tosa_higienica:"Tosa higiênica",
    transporte:"Transporte",
    outro:"Outro"
  })[type] || type;
}

function eventBg(ev){
  if (ev.operStatus === "concluido") return (ev.kind==="task" ? "bg-okTask" : "bg-ok");
  if (ev.operStatus === "cancelado") return "bg-transOpen";

  if (ev.kind==="task") return "bg-taskOpen";
  switch(ev.type){
    case "banho": return "bg-bathOpen";
    case "tosa_higienica": return "bg-hygOpen";
    case "transporte": return "bg-transOpen";
    case "diaria": return "bg-hotelOpen";
    case "creche": return "bg-daycareOpen";
    default: return "bg-otherOpen";
  }
}

function defaultPrice(type){
  const map = { creche:120, diaria:180, banho:120, tosa_higienica:60, transporte:40, outro:0 };
  return map[type] ?? 0;
}

function openDialog(id){ $(id).showModal(); }
function closeDialog(id){ $(id).close(); }

async function loadLookups(){
  const r = await apiJsonp("getLookups", {});
  if (!r.ok) throw new Error(r.error || "Falha em getLookups.");
  fillDogs(r.dogs || []);
  fillCustomers(r.customers || []);
}

function fillDogs(dogs){
  const sel = $("svcDog");
  sel.innerHTML = "";
  for (const d of dogs){
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = `${d.name}${d.customerName ? " (Tutor: "+d.customerName+")" : ""}`;
    sel.appendChild(opt);
  }
}

function fillCustomers(customers){
  const sel = $("dogCustomer");
  sel.innerHTML = "";
  for (const c of customers){
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  }
}

function renderEvents(events){
  const root = $("eventsList");
  root.innerHTML = "";

  if (!events.length){
    root.innerHTML = `<div class="event"><div class="event__title">Nenhum evento para hoje.</div></div>`;
    return;
  }

  for (const ev of events){
    const bg = eventBg(ev);
    const time = ev.kind==="service"
      ? (ev.startTime ? `${ev.startTime}${ev.endTime? "–"+ev.endTime:""}` : "")
      : (ev.time || "");

    const title = ev.kind==="task"
      ? ev.title
      : `${labelTipo(ev.type)} — ${ev.dogName || "Cachorro"}`;

    const meta = ev.kind==="task"
      ? `${ev.date}${time ? " • "+time : ""}`
      : `${ev.date}${time ? " • "+time : ""}${ev.customerName ? " • "+ev.customerName : ""}`;

    const statusTxt =
      ev.operStatus === "concluido" ? "Concluído" :
      ev.operStatus === "cancelado" ? "Cancelado" : "Em aberto";

    const el = document.createElement("div");
    el.className = `event ${bg}`;
    el.innerHTML = `
      <button class="iconX" title="Excluir">×</button>
      <div class="event__title">${escapeHtml(title)}</div>
      <div class="event__meta">${escapeHtml(meta)}</div>
      <div class="badges">
        <span class="badge">${escapeHtml(statusTxt)}</span>
        ${ev.kind==="service" ? `<span class="badge">${escapeHtml(moneyBR(ev.price||0))}</span>` : ""}
        ${ev.kind==="service" ? `<span class="badge"><a href="dog.html?id=${encodeURIComponent(ev.dogId)}">Abrir cachorro</a></span>` : ""}
        ${ev.kind==="service" ? `<span class="badge"><a href="customer.html?id=${encodeURIComponent(ev.customerId)}">Abrir cliente</a></span>` : ""}
      </div>
      <div class="actions">
        <button class="btn btn--ghost btnToggle"></button>
        <button class="btn btn--ghost btnCancel">${ev.operStatus==="cancelado" ? "Reabrir" : "Cancelar"}</button>
      </div>
    `;

    el.querySelector(".btnToggle").textContent =
      ev.operStatus==="concluido" ? "Reabrir" : "Marcar como concluído";

    el.querySelector(".iconX").addEventListener("click", async () => {
      if (!confirm("Excluir este evento?")) return;
      const r = await apiJsonp("deleteEvent", { id: ev.id, kind: ev.kind });
      if (!r.ok) return alert(r.error || "Falha ao excluir.");
      await loadToday();
    });

    el.querySelector(".btnToggle").addEventListener("click", async () => {
      const next = (ev.operStatus==="concluido") ? "aberto" : "concluido";
      const r = await apiJsonp("setEventStatus", { id: ev.id, kind: ev.kind, operStatus: next });
      if (!r.ok) return alert(r.error || "Falha ao atualizar.");
      await loadToday();
    });

    el.querySelector(".btnCancel").addEventListener("click", async () => {
      const next = (ev.operStatus==="cancelado") ? "aberto" : "cancelado";
      const r = await apiJsonp("setEventStatus", { id: ev.id, kind: ev.kind, operStatus: next });
      if (!r.ok) return alert(r.error || "Falha ao atualizar.");
      await loadToday();
    });

    root.appendChild(el);
  }
}

async function loadToday(){
  clearAlert();
  const date = todayISO();
  $("todayTitle").textContent = `Hoje — ${formatDatePt(date)}`;
  const r = await apiJsonp("getToday", { date });
  if (!r.ok) throw new Error(r.error || "Falha em getToday.");
  renderEvents(r.events || []);
}

async function runSearch(){
  const q = $("searchInput").value.trim();
  if (!q) return;
  const r = await apiJsonp("search", { q });
  if (!r.ok) throw new Error(r.error || "Falha na busca.");

  const dogs = r.dogs || [];
  const customers = r.customers || [];

  // wholesome UX: if exact single match, open it; else prompt list
  if (dogs.length===1 && customers.length===0){
    window.open(`dog.html?id=${encodeURIComponent(dogs[0].id)}`, "_blank");
    return;
  }
  if (customers.length===1 && dogs.length===0){
    window.open(`customer.html?id=${encodeURIComponent(customers[0].id)}`, "_blank");
    return;
  }

  const lines = [];
  if (dogs.length) lines.push("Cachorros:\n" + dogs.map(d => `• ${d.name} (Tutor: ${d.customerName||"-"}) — dog.html?id=${d.id}`).join("\n"));
  if (customers.length) lines.push("Clientes:\n" + customers.map(c => `• ${c.name} — customer.html?id=${c.id}`).join("\n"));
  alert(lines.length ? lines.join("\n\n") : "Nada encontrado.");
}

function wire(){
  document.querySelectorAll("[data-close]").forEach(btn=>{
    btn.addEventListener("click", ()=> closeDialog(btn.getAttribute("data-close")));
  });

  $("btnRefresh").addEventListener("click", ()=> boot());

  $("btnNewService").addEventListener("click", ()=>{
    $("svcType").value = "creche";
    $("svcDate").value = todayISO();
    $("svcStart").value = "";
    $("svcEnd").value = "";
    $("svcPrice").value = defaultPrice("creche");
    $("svcNotes").value = "";
    openDialog("serviceDialog");
  });

  $("svcType").addEventListener("change", ()=>{
    $("svcPrice").value = defaultPrice($("svcType").value);
  });

  $("serviceForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = {
      type: $("svcType").value,
      dogId: $("svcDog").value,
      date: $("svcDate").value,
      startTime: $("svcStart").value,
      endTime: $("svcEnd").value,
      price: Number($("svcPrice").value||0),
      notes: $("svcNotes").value
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
    const payload = { title:$("taskTitle").value.trim(), date:$("taskDate").value, time:$("taskTime").value, desc:$("taskDesc").value };
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
    $("custNotes").value = "";
    openDialog("customerDialog");
  });

  $("customerForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = {
      name:$("custName").value.trim(),
      whatsapp:$("custWhatsapp").value.trim(),
      email:$("custEmail").value.trim(),
      address:$("custAddress").value.trim(),
      notes:$("custNotes").value.trim()
    };
    if (!payload.name) return alert("Nome é obrigatório.");
    const r = await apiJsonp("addCustomer", payload);
    if (!r.ok) return alert(r.error || "Falha ao salvar cliente.");
    closeDialog("customerDialog");
    await loadLookups();
    await loadToday();
  });

  $("btnNewDog").addEventListener("click", ()=>{
    ["dogName","dogBreed","dogPhotoUrl","dogDiet","dogTemper","dogVaccines","dogParasite","dogHealth","dogMeds","dogAllergies","dogEmergencyName","dogEmergencyPhone","dogVetName","dogVetPhone","dogNotes"]
      .forEach(id => $(id).value = "");
    $("dogAgeYears").value = 0;
    $("dogAgeMonths").value = 0;
    $("dogSex").value = "";
    $("dogNeutered").value = "";
    $("dogWeight").value = "";
    openDialog("dogDialog");
  });

  $("dogForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = {
      name:$("dogName").value.trim(),
      breed:$("dogBreed").value.trim(),
      ageYears:Number($("dogAgeYears").value||0),
      ageMonths:Number($("dogAgeMonths").value||0),
      sex:$("dogSex").value,
      neutered:$("dogNeutered").value,
      weightKg:Number($("dogWeight").value||0),
      customerId:$("dogCustomer").value,
      photoUrl:$("dogPhotoUrl").value.trim(),
      diet:$("dogDiet").value,
      temperament:$("dogTemper").value,
      vaccines:$("dogVaccines").value,
      parasiteControl:$("dogParasite").value,
      health:$("dogHealth").value,
      meds:$("dogMeds").value,
      allergies:$("dogAllergies").value,
      emergencyName:$("dogEmergencyName").value,
      emergencyPhone:$("dogEmergencyPhone").value,
      vetName:$("dogVetName").value,
      vetPhone:$("dogVetPhone").value,
      notes:$("dogNotes").value
    };
    if (!payload.name || !payload.customerId) return alert("Nome e cliente são obrigatórios.");
    const r = await apiJsonp("addDog", payload);
    if (!r.ok) return alert(r.error || "Falha ao salvar cachorro.");
    closeDialog("dogDialog");
    await loadLookups();
    await loadToday();
  });

  $("searchBtn").addEventListener("click", async ()=> { try{ await runSearch(); }catch(err){ alert(err.message); } });
  $("searchInput").addEventListener("keydown", async (e)=>{ if(e.key==="Enter"){ e.preventDefault(); try{ await runSearch(); }catch(err){ alert(err.message); } } });

  $("btnGenerate").addEventListener("click", async ()=>{
    const dateFrom = todayISO();
    const r = await apiJsonp("generateFromRegular", { dateFrom, days:14 });
    if (!r.ok) return alert(r.error || "Falha ao gerar agenda.");
    alert(`Agenda gerada.\nCriados: ${r.created}\nIgnorados (já existiam): ${r.skipped}`);
    await loadToday();
  });
}

async function boot(){
  try{
    if (!window.CONFIG?.API_URL || window.CONFIG.API_URL.includes("PASTE")) {
      setAlert("Configure assets/config.js com a URL /exec do seu Apps Script.");
      return;
    }
    await loadLookups();
    await loadToday();
  }catch(err){
    console.error(err);
    setAlert(err.message || String(err));
  }
}

wire();
boot();

