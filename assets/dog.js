let _dog = null;
let _lookups = null;
let _regular = []; // cache regular services for checkbox prefill

function badge(text){ return `<span class="badge">${escapeHtml(text)}</span>`; }

function labelType(t){
  const m = { creche:"Creche", diaria:"Diária", banho:"Banho", tosa_higienica:"Tosa higiênica", transporte:"Transporte", outro:"Outro" };
  return m[t] || t;
}

function defaultPrice(type){
  const map = { creche:120, transporte:40 };
  return map[type] ?? 0;
}

function openDialog(id){ $(id).showModal(); }
function closeDialog(id){ $(id).close(); }

/* ---------- Weekdays UI (edit dialog) ---------- */
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

function clearWeekdays(group){
  document.querySelectorAll(`input[type="checkbox"][data-group="${group}"]`).forEach(b=> b.checked = false);
}

function setSelectedWeekdays(group, csv){
  const set = new Set(String(csv||"").split(",").map(x=>Number(String(x).trim())).filter(n=>n>=1&&n<=7));
  document.querySelectorAll(`input[type="checkbox"][data-group="${group}"]`).forEach(b=>{
    const n = Number(b.getAttribute("data-wd"));
    b.checked = set.has(n);
  });
}

function getSelectedWeekdays(group){
  const boxes = document.querySelectorAll(`input[type="checkbox"][data-group="${group}"]`);
  const nums = [];
  boxes.forEach(b=>{ if (b.checked) nums.push(Number(b.getAttribute("data-wd"))); });
  return nums.join(",");
}

/* ---------- Renders ---------- */
function renderDog(d){
  $("title").textContent = d.name ? `Cachorro — ${d.name}` : "Cachorro";
  const age = calcAgeFromBirth(d.birthDate || "");
  $("subtitle").textContent = d.customerName ? `Tutor: ${d.customerName}` : "";

  $("dogCard").innerHTML = `
    <div class="section-title">Dados</div>
    <div class="sub">Raça: ${escapeHtml(d.breed || "-")}</div>
    <div class="sub">Nascimento: ${escapeHtml(d.birthDate || "-")} ${age ? `• Idade: ${age}` : ""}</div>
    <div class="sub">Foto (URL): ${escapeHtml(d.photoUrl || "-")}</div>
    <hr class="sep"/>
    <div class="sub"><b>Dieta:</b> ${escapeHtml(d.diet || "-")}</div>
    <div class="sub"><b>Temperamento:</b> ${escapeHtml(d.temperament || "-")}</div>
    <div class="sub"><b>Vacinas:</b> ${escapeHtml(d.vaccines || "-")}</div>
    <div class="sub"><b>Saúde:</b> ${escapeHtml(d.health || "-")}</div>
    <div class="sub"><b>Observações:</b> ${escapeHtml(d.notes || "-")}</div>
  `;
}

function renderRegular(list){
  const root = $("regularList");
  root.innerHTML = "";
  if (!list.length){
    root.innerHTML = `<div class="event"><div class="event__title">Nenhum serviço regular.</div></div>`;
    return;
  }
  list.forEach(r=>{
    const el = document.createElement("div");
    el.className = "event bg-transOpen";
    el.innerHTML = `
      <div class="event__title">${escapeHtml(labelType(r.type))}</div>
      <div class="event__meta">Dias: ${escapeHtml(r.weekdays || "")} • Ativo: ${escapeHtml(r.active || "")}</div>
      <div class="event__badges">
        ${badge(`R$ ${formatMoney(r.price||0)}`)}
        ${badge(r.notes || "")}
      </div>
    `;
    root.appendChild(el);
  });
}

function renderServices(list){
  const root = $("serviceList");
  root.innerHTML = "";
  if (!list.length){
    root.innerHTML = `<div class="event"><div class="event__title">Nenhum serviço registrado.</div></div>`;
    return;
  }
  list.slice().reverse().forEach(s=>{
    const el = document.createElement("div");
    el.className = "event bg-bathOpen";
    el.innerHTML = `
      <div class="event__title">${escapeHtml(labelType(s.type))}</div>
      <div class="event__meta">${escapeHtml(s.date || "")} ${s.startTime ? "• "+escapeHtml(s.startTime) : ""} ${s.source==="regular" ? "• Regular" : ""}</div>
      <div class="event__badges">
        ${badge(`R$ ${formatMoney(s.price||0)}`)}
        ${badge(s.operStatus || "")}
      </div>
    `;
    root.appendChild(el);
  });
}

/* ---------- Lookups ---------- */
async function loadLookups(){
  const r = await apiJsonp("getLookups", {});
  if (!r.ok) throw new Error(r.error || "Falha ao carregar lookups.");
  _lookups = r;
}

function fillCustomerSelect(selectedId){
  const sel = $("edCustomer");
  sel.innerHTML = "";
  (_lookups?.customers || []).forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    if (String(c.id) === String(selectedId)) opt.selected = true;
    sel.appendChild(opt);
  });
}

function prefillRegularCheckboxes(){
  const creche = _regular.find(r=> String(r.type) === "creche" && String(r.active||"sim").toLowerCase() === "sim");
  const transp = _regular.find(r=> String(r.type) === "transporte" && String(r.active||"sim").toLowerCase() === "sim");

  clearWeekdays("creche");
  clearWeekdays("transporte");

  if (creche) setSelectedWeekdays("creche", creche.weekdays || "");
  if (transp) setSelectedWeekdays("transporte", transp.weekdays || "");
}

/* ---------- Wiring ---------- */
function wireEditDog(){
  $("btnCancelDogEdit").addEventListener("click", ()=> closeDialog("dogEditDialog"));

  $("btnEditDog").addEventListener("click", async ()=>{
    if (!_dog) return;
    if (!_lookups) await loadLookups();

    $("edName").value = _dog.name || "";
    $("edBreed").value = _dog.breed || "";
    $("edBirthDate").value = _dog.birthDate || "";
    $("edPhotoUrl").value = _dog.photoUrl || "";
    $("edDiet").value = _dog.diet || "";
    $("edTemperament").value = _dog.temperament || "";
    $("edVaccines").value = _dog.vaccines || "";
    $("edHealth").value = _dog.health || "";
    $("edNotes").value = _dog.notes || "";

    fillCustomerSelect(_dog.customerId);
    prefillRegularCheckboxes();

    openDialog("dogEditDialog");
  });

  $("dogEditForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    if (!_dog) return;

    const btn = $("btnSaveDogEdit");
    btn.disabled = true;
    const prevTxt = btn.textContent;
    btn.textContent = "Salvando…";

    try{
      const payload = {
        id: _dog.id,
        name: $("edName").value.trim(),
        breed: $("edBreed").value.trim(),
        birthDate: $("edBirthDate").value,
        customerId: $("edCustomer").value,
        photoUrl: $("edPhotoUrl").value.trim(),
        diet: $("edDiet").value,
        temperament: $("edTemperament").value,
        vaccines: $("edVaccines").value,
        health: $("edHealth").value,
        notes: $("edNotes").value,
      };

      const r = await apiJsonp("updateDog", payload);
      if (!r.ok) throw new Error(r.error || "Falha ao atualizar cachorro.");

      // Save regular schedule (upsert per type)
      const crecheW = getSelectedWeekdays("creche");
      const transW  = getSelectedWeekdays("transporte");

      const rr1 = await apiJsonp("setRegularForDog", {
        dogId: _dog.id,
        type: "creche",
        weekdays: crecheW,
        startTime: "",
        endTime: "",
        price: defaultPrice("creche"),
        notes: "Regular (editado)",
        active: "sim"
      });
      if (!rr1.ok) throw new Error(rr1.error || "Falha ao salvar regular (creche).");

      const rr2 = await apiJsonp("setRegularForDog", {
        dogId: _dog.id,
        type: "transporte",
        weekdays: transW,
        startTime: "",
        endTime: "",
        price: defaultPrice("transporte"),
        notes: "Regular (editado)",
        active: "sim"
      });
      if (!rr2.ok) throw new Error(rr2.error || "Falha ao salvar regular (transporte).");

      closeDialog("dogEditDialog");
      await boot();
    }catch(err){
      alert(err.message || String(err));
    }finally{
      btn.disabled = false;
      btn.textContent = prevTxt;
    }
  });
}

/* ---------- Boot ---------- */
async function boot(){
  const id = qs("id");
  if (!id) return alert("Falta ?id=");

  const r1 = await apiJsonp("getDog", { id });
  if (!r1.ok) return alert(r1.error || "Falha ao carregar cachorro.");

  _dog = r1.dog;
  _regular = r1.regularServices || [];

  renderDog(r1.dog);
  renderRegular(_regular);
  renderServices(r1.services || []);
}

renderWeekdays("edRgCrecheDays", "creche");
renderWeekdays("edRgTransDays", "transporte");

wireEditDog();
boot().catch(e=>alert(e.message||String(e)));
