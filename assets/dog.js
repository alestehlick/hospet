let _dog = null;
let _lookups = null;

function badge(text){ return `<span class="badge">${escapeHtml(text)}</span>`; }

function labelType(t){
  const m = { creche:"Creche", diaria:"Diária", banho:"Banho", tosa_higienica:"Tosa higiênica", transporte:"Transporte", outro:"Outro" };
  return m[t] || t;
}

function openDialog(id){ $(id).showModal(); }
function closeDialog(id){ $(id).close(); }

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

    openDialog("dogEditDialog");
  });

  $("dogEditForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    if (!_dog) return;

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
    if (!r.ok) return alert(r.error || "Falha ao atualizar cachorro.");

    closeDialog("dogEditDialog");
    await boot();
  });
}

async function boot(){
  const id = qs("id");
  if (!id) return alert("Falta ?id=");

  const r1 = await apiJsonp("getDog", { id });
  if (!r1.ok) return alert(r1.error || "Falha ao carregar cachorro.");

  _dog = r1.dog;

  renderDog(r1.dog);
  renderRegular(r1.regularServices || []);
  renderServices(r1.services || []);
}

wireEditDog();
boot().catch(e=>alert(e.message||String(e)));
