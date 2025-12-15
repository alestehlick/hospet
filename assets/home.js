/* =========================================================
   Home (Agenda) — Faster UI (Event Delegation + Batch Render)
   - optimistic UI for toggle/delete
   - write-behind queue
   - avoids full reload after every click
   - fewer listeners (single delegated handler)
   ========================================================= */

let _searchTimer = null;
let _events = [];
let _eventIndex = new Map();

function setApiStatus(msg) {
  const el = $("apiStatus");
  if (el) el.textContent = msg || "";
}

function defaultPrice(type) {
  const map = { creche:120, diaria:180, banho:120, tosa_higienica:60, transporte:40, outro:0 };
  return map[type] ?? 0;
}

function labelTipoServico(type) {
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

function eventBgClass(ev) {
  if (ev.kind === "task") {
    if (ev.operStatus === "concluido") return "bg-okTask stripe";
    return "bg-taskOpen stripe";
  }
  if (ev.operStatus === "concluido") return "bg-ok";
  switch (ev.type) {
    case "banho": return "bg-bathOpen";
    case "tosa_higienica": return "bg-hygOpen";
    case "transporte": return "bg-transOpen";
    case "diaria": return "bg-hotelOpen";
    case "creche": return "bg-daycareOpen";
    case "outro": return "bg-otherOpen";
    default: return "bg-otherOpen";
  }
}

function sortEvents(list) {
  return list.slice().sort((a, b) =>
    String(a.startTime || a.time || "99:99").localeCompare(String(b.startTime || b.time || "99:99"))
  );
}

function keyOf(ev) { return `${ev.kind}:${ev.id}`; }

function rebuildIndex() {
  _eventIndex = new Map();
  for (const ev of _events) _eventIndex.set(keyOf(ev), ev);
}

function renderOneEventHtml(ev) {
  const bg = eventBgClass(ev);
  const time = ev.startTime ? `${ev.startTime}${ev.endTime ? "–" + ev.endTime : ""}` : "";
  const title = ev.kind === "task"
    ? (ev.title || "Tarefa")
    : `${labelTipoServico(ev.type)} — ${ev.dogName || "Cachorro"}`;

  const meta = ev.kind === "task"
    ? `${ev.date || ""}${ev.time ? " • " + ev.time : ""}`
    : `${ev.date || ""}${time ? " • " + time : ""}${ev.customerName ? " • " + ev.customerName : ""}${ev.source === "regular" ? " • Regular" : ""}`;

  const statusTxt = ev.operStatus === "concluido" ? "Concluído" : "Em aberto";

  return `
    <div class="event ${bg}" data-id="${escapeHtml(ev.id)}" data-kind="${escapeHtml(ev.kind)}">
      <button class="iconX" title="Excluir" aria-label="Excluir" type="button">×</button>
      <div class="event__title">${escapeHtml(title)}</div>
      <div class="event__meta">${escapeHtml(meta)}</div>
      <div class="event__badges">
        <span class="badge" data-status>${escapeHtml(statusTxt)}</span>
        ${ev.kind === "service" ? `<span class="badge">R$ ${formatMoney(ev.price || 0)}</span>` : ""}
        <span class="badge" data-sync hidden>Sincronizando…</span>
      </div>
      <div class="event__actions">
        <button class="btn btn--ghost btnToggle" type="button">
          ${ev.operStatus === "concluido" ? "Reabrir" : "Marcar como concluído"}
        </button>
      </div>
    </div>
  `;
}

function renderEvents(list) {
  const root = $("eventsList");
  if (!root) return;

  _events = sortEvents(list || []);
  rebuildIndex();

  if (!_events.length) {
    root.innerHTML = `<div class="event"><div class="event__title">Nenhum evento para hoje.</div></div>`;
    return;
  }

  root.innerHTML = _events.map(renderOneEventHtml).join("");
}

function wireEventsDelegation() {
  const root = $("eventsList");
  if (!root) return;

  root.addEventListener("click", (e) => {
    const card = e.target.closest(".event");
    if (!card || !root.contains(card)) return;

    const kind = card.getAttribute("data-kind");
    const id = card.getAttribute("data-id");
    const ev = _eventIndex.get(`${kind}:${id}`);
    if (!ev) return;

    if (e.target.closest(".iconX")) {
      if (!confirm("Excluir este evento?")) return;

      _events = _events.filter(x => !(String(x.id) === String(id) && String(x.kind) === String(kind)));
      renderEvents(_events);

      enqueue("deleteEvent", { id, kind });
      return;
    }

    if (e.target.closest(".btnToggle")) {
      const next = ev.operStatus === "concluido" ? "aberto" : "concluido";
      ev.operStatus = next;

      const syncBadge = card.querySelector("[data-sync]");
      if (syncBadge) syncBadge.hidden = false;

      card.className = `event ${eventBgClass(ev)}`;
      const btn = card.querySelector(".btnToggle");
      if (btn) btn.textContent = (next === "concluido") ? "Reabrir" : "Marcar como concluído";
      const st = card.querySelector("[data-status]");
      if (st) st.textContent = (next === "concluido") ? "Concluído" : "Em aberto";

      enqueue("setEventStatus", { id, kind, operStatus: next });

      setTimeout(() => { if (syncBadge) syncBadge.hidden = true; }, 1200);
    }
  });
}

/* ---------- Lookups ---------- */
async function loadLookups() {
  const r = await apiGetLookupsCached();
  if (!r.ok) throw new Error(r.error || "Falha ao carregar listas.");

  const dogs = r.dogs || [];
  const customers = r.customers || [];

  const selDog = $("svcDog");
  const selCust = $("dogCustomer");
  if (selDog) {
    selDog.innerHTML = "";
    dogs.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name + (d.customerName ? ` (Tutor: ${d.customerName})` : "");
      selDog.appendChild(opt);
    });
  }

  if (selCust) {
    selCust.innerHTML = "";
    customers.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      selCust.appendChild(opt);
    });
  }
}

/* ---------- Today ---------- */
async function loadToday({ force = false } = {}) {
  const date = todayISO();
  const title = $("todayTitle");
  if (title) title.textContent = `Hoje — ${formatDatePt(date)}`;

  const r = force ? await apiJsonp("getToday", { date }) : await apiGetTodayCached(date);
  if (!r.ok) throw new Error(r.error || "Falha ao carregar agenda.");
  renderEvents(r.events || []);
}

/* ---------- Autocomplete ---------- */
function hideSuggest() {
  const box = $("searchSuggest");
  if (!box) return;
  box.hidden = true;
  box.innerHTML = "";
}
function showSuggest(items) {
  const box = $("searchSuggest");
  if (!box) return;
  if (!items.length) { hideSuggest(); return; }
  box.hidden = false;
  box.innerHTML = items.map(it => `
    <div class="row" data-kind="${escapeHtml(it.kind)}" data-id="${escapeHtml(it.id)}">
      <div>
        <div class="name">${escapeHtml(it.name)}</div>
        <div class="meta">${escapeHtml(it.meta || "")}</div>
      </div>
      <div class="kind">${escapeHtml(it.kindLabel)}</div>
    </div>
  `).join("");
}

async function refreshSuggest() {
  const input = $("searchInput");
  if (!input) return;
  const q = input.value.trim();
  if (q.length < 2) { hideSuggest(); return; }

  const r = await apiJsonp("search", { q });
  if (!r.ok) throw new Error(r.error || "Falha na busca.");

  const dogs = (r.dogs || []).slice(0, 8).map(d => ({
    kind:"dog", kindLabel:"Cachorro",
    id:d.id, name:d.name,
    meta: d.customerName ? `Tutor: ${d.customerName}` : ""
  }));

  const customers = (r.customers || []).slice(0, 8).map(c => ({
    kind:"customer", kindLabel:"Cliente",
    id:c.id, name:c.name,
    meta: c.whatsapp ? `WhatsApp: ${c.whatsapp}` : ""
  }));

  showSuggest([...dogs, ...customers]);
}

async function runSearch() {
  const input = $("searchInput");
  if (!input) return;
  const q = input.value.trim();
  if (!q) return;

  const r = await apiJsonp("search", { q });
  if (!r.ok) return alert(r.error || "Falha na busca.");

  const dogs = r.dogs || [];
  const customers = r.customers || [];
  if (dogs.length === 1 && customers.length === 0) {
    window.open(`dog.html?id=${encodeURIComponent(dogs[0].id)}`, "_blank");
    return;
  }
  if (customers.length === 1 && dogs.length === 0) {
    window.open(`customer.html?id=${encodeURIComponent(customers[0].id)}`, "_blank");
    return;
  }
  alert("Use as sugestões da busca para abrir a ficha.");
}

/* ---------- Weekdays UI ---------- */
function renderWeekdays(containerId, group) {
  const root = $(containerId);
  if (!root) return;
  root.className = "weekdays";
  const days = [
    {n:1, t:"Seg"}, {n:2, t:"Ter"}, {n:3, t:"Qua"},
    {n:4, t:"Qui"}, {n:5, t:"Sex"}, {n:6, t:"Sáb"}, {n:7, t:"Dom"},
  ];
  root.innerHTML = days.map(d => `
    <label><input type="checkbox" data-wd="${d.n}" data-group="${group}"/> ${d.t}</label>
  `).join("");
}
function getSelectedWeekdays(group) {
  const boxes = document.querySelectorAll(`input[type="checkbox"][data-group="${group}"]`);
  const nums = [];
  boxes.forEach(b => { if (b.checked) nums.push(Number(b.getAttribute("data-wd"))); });
  return nums.join(",");
}
function clearWeekdays(group) {
  document.querySelectorAll(`input[type="checkbox"][data-group="${group}"]`).forEach(b => b.checked = false);
}

/* ---------- Dialog helpers ---------- */
function openDialog(id) { const d = $(id); if (d) d.showModal(); }
function closeDialog(id) { const d = $(id); if (d) d.close(); }

/* ---------- Wiring ---------- */
function wire() {
  window.addEventListener("hb:sync", (e) => {
    const { syncing, queued } = e.detail || {};
    if (syncing && queued) setApiStatus(`Sincronizando… (${queued})`);
    else if (queued) setApiStatus(`Fila pendente (${queued})`);
    else setApiStatus("API OK");
  });

  document.querySelectorAll(".btnCancel").forEach(btn => {
    btn.addEventListener("click", () => {
      const dlg = btn.closest("dialog");
      if (dlg) dlg.close();
    });
  });

  renderWeekdays("rgCrecheDays", "creche");
  renderWeekdays("rgTransDays", "transporte");

  const suggest = $("searchSuggest");
  if (suggest) {
    suggest.addEventListener("click", (e) => {
      const row = e.target.closest(".row");
      if (!row) return;
      const kind = row.getAttribute("data-kind");
      const id = row.getAttribute("data-id");
      hideSuggest();
      if (kind === "dog") window.open(`dog.html?id=${encodeURIComponent(id)}`, "_blank");
      if (kind === "customer") window.open(`customer.html?id=${encodeURIComponent(id)}`, "_blank");
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".searchWrap")) hideSuggest();
  });

  const input = $("searchInput");
  if (input) {
    input.addEventListener("input", () => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => { refreshSuggest().catch(() => {}); }, 220);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideSuggest();
      if (e.key === "Enter") runSearch().catch(() => {});
    });
  }

  const btnSearch = $("searchBtn");
  if (btnSearch) btnSearch.addEventListener("click", () => runSearch().catch(() => {}));

  const btnRefresh = $("btnRefresh");
  if (btnRefresh) btnRefresh.addEventListener("click", () => boot({ forceToday: true }));

  const btnGenerate = $("btnGenerate");
  if (btnGenerate) {
    btnGenerate.addEventListener("click", async () => {
      try {
        const startDate = todayISO();
        const r = await apiJsonp("generateFromRegular", { startDate, days: 14 });
        if (!r.ok) throw new Error(r.error || "Falha ao gerar agenda.");
        alert(`Agenda gerada: ${r.created} serviços (janela ${r.startDate} → ${r.days} dias)`);
        await loadToday({ force: true });
      } catch (err) {
        alert(err.message || String(err));
      }
    });
  }

  // --- dialogs + forms (same logic as yours; kept intact) ---
  const btnNewService = $("btnNewService");
  if (btnNewService) btnNewService.addEventListener("click", () => {
    $("svcType").value = "creche";
    $("svcDate").value = todayISO();
    $("svcStart").value = "";
    $("svcEnd").value = "";
    $("svcPrice").value = defaultPrice("creche");
    $("svcNotes").value = "";
    openDialog("serviceDialog");
  });

  const svcType = $("svcType");
  if (svcType) svcType.addEventListener("change", () => {
    $("svcPrice").value = defaultPrice($("svcType").value);
  });

  const serviceForm = $("serviceForm");
  if (serviceForm) serviceForm.addEventListener("submit", async (e) => {
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
    if (payload.date === todayISO()) await loadToday({ force: true });
  });

  const btnNewTask = $("btnNewTask");
  if (btnNewTask) btnNewTask.addEventListener("click", () => {
    $("taskTitle").value = "";
    $("taskDate").value = todayISO();
    $("taskTime").value = "";
    $("taskDesc").value = "";
    openDialog("taskDialog");
  });

  const taskForm = $("taskForm");
  if (taskForm) taskForm.addEventListener("submit", async (e) => {
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
    if (payload.date === todayISO()) await loadToday({ force: true });
  });

  const btnNewCustomer = $("btnNewCustomer");
  if (btnNewCustomer) btnNewCustomer.addEventListener("click", () => {
    $("custName").value = "";
    $("custWhatsapp").value = "";
    $("custEmail").value = "";
    $("custAddress").value = "";
    $("custCreditCreche").value = 0;
    $("custCreditTransp").value = 0;
    $("custCreditBanho").value = 0;
    openDialog("customerDialog");
  });

  const customerForm = $("customerForm");
  if (customerForm) customerForm.addEventListener("submit", async (e) => {
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

  const btnNewDog = $("btnNewDog");
  if (btnNewDog) btnNewDog.addEventListener("click", () => {
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

  const dogBirth = $("dogBirthDate");
  if (dogBirth) dogBirth.addEventListener("change", () => {
    $("dogAgeDisplay").value = calcAgeFromBirth($("dogBirthDate").value);
  });

  const dogForm = $("dogForm");
  if (dogForm) dogForm.addEventListener("submit", async (e) => {
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

    const crecheW = getSelectedWeekdays("creche");
    if (crecheW) {
      const rr = await apiJsonp("addRegularService", {
        dogId, type: "creche", weekdays: crecheW,
        startTime: "", endTime: "",
        price: defaultPrice("creche"),
        notes: "Regular (criado no cadastro)",
      });
      if (!rr.ok) return alert(rr.error || "Falha ao salvar regular (creche).");
    }

    const transW = getSelectedWeekdays("transporte");
    if (transW) {
      const rr = await apiJsonp("addRegularService", {
        dogId, type: "transporte", weekdays: transW,
        startTime: "", endTime: "",
        price: defaultPrice("transporte"),
        notes: "Regular (criado no cadastro)",
      });
      if (!rr.ok) return alert(rr.error || "Falha ao salvar regular (transporte).");
    }

    closeDialog("dogDialog");
    await loadLookups();
    await loadToday({ force: true });
  });
}

async function boot({ forceToday = false } = {}) {
  try {
    setApiStatus("Conectando…");
    const ping = await apiJsonp("ping", {});
    if (!ping.ok) throw new Error(ping.error || "API offline.");

    if (queueSize() > 0) processQueue().catch(() => {});
    setApiStatus("API OK");

    await loadLookups();
    await loadToday({ force: forceToday });

    setInterval(() => loadToday().catch(() => {}), 60_000);
  } catch (err) {
    console.error(err);
    setApiStatus("API com erro");
    alert(err.message || String(err));
  }
}

(function init() {
  wireEventsDelegation();
  wire();
  boot();
})();
