const $ = (id)=>document.getElementById(id);
function setAlert(msg){ $("alerts").innerHTML = `<div class="alert">${escapeHtml(msg)}</div>`; }
function clearAlert(){ $("alerts").innerHTML = ""; }
function openDialog(id){ $(id).showModal(); }
function closeDialog(id){ $(id).close(); }

function qs(name){
  return new URLSearchParams(location.search).get(name);
}

function labelTipo(type){
  return ({creche:"Creche",diaria:"Diária (hotel)",banho:"Banho",tosa_higienica:"Tosa higiênica",transporte:"Transporte",outro:"Outro"})[type] || type;
}

function defaultPrice(type){
  const map = { creche:120, diaria:180, banho:120, tosa_higienica:60, transporte:40, outro:0 };
  return map[type] ?? 0;
}

function renderRegular(list){
  const root = $("regularList");
  root.innerHTML = "";
  if (!list.length){
    root.innerHTML = `<div class="alert">Nenhum serviço regular cadastrado.</div>`;
    return;
  }
  for (const r of list){
    const el = document.createElement("div");
    el.className = "event";
    el.innerHTML = `
      <div class="event__title">${escapeHtml(labelTipo(r.type))}</div>
      <div class="event__meta">Dias: ${escapeHtml(String(r.weekdays||""))} ${r.startTime? " • "+escapeHtml(r.startTime):""}${r.endTime? "–"+escapeHtml(r.endTime):""}</div>
      <div class="badges">
        <span class="badge">${escapeHtml(moneyBR(r.price||0))}</span>
      </div>
    `;
    root.appendChild(el);
  }
}

function renderServices(list){
  const root = $("serviceList");
  root.innerHTML = "";
  if (!list.length){
    root.innerHTML = `<div class="alert">Nenhum serviço ainda.</div>`;
    return;
  }
  for (const s of list.slice().reverse()){
    const el = document.createElement("div");
    el.className = "event";
    el.innerHTML = `
      <div class="event__title">${escapeHtml(labelTipo(s.type))}</div>
      <div class="event__meta">${escapeHtml(s.date)}${s.startTime? " • "+escapeHtml(s.startTime):""} • ${escapeHtml(s.operStatus||"aberto")}</div>
      <div class="badges"><span class="badge">${escapeHtml(moneyBR(s.price||0))}</span></div>
    `;
    root.appendChild(el);
  }
}

function safetyBlock(d){
  const parts = [];
  if (d.meds) parts.push("Medicamentos: " + d.meds);
  if (d.allergies) parts.push("Alergias: " + d.allergies);
  if (d.health) parts.push("Saúde: " + d.health);
  if (d.emergencyName || d.emergencyPhone) parts.push(`Emergência: ${d.emergencyName||""} ${d.emergencyPhone||""}`.trim());
  if (d.vetName || d.vetPhone) parts.push(`Veterinário: ${d.vetName||""} ${d.vetPhone||""}`.trim());
  if (!parts.length) return `<strong>⚠️ Informações rápidas</strong><div style="color:#666">Nenhum alerta cadastrado.</div>`;
  return `<strong>⚠️ Informações rápidas</strong><div>${parts.map(escapeHtml).join("<br/>")}</div>`;
}

async function boot(){
  clearAlert();
  const id = qs("id");
  if (!id) return setAlert("ID do cachorro não informado.");

  try{
    const r = await apiJsonp("getDog", { id });
    if (!r.ok) throw new Error(r.error || "Falha ao carregar cachorro.");

    const d = r.dog;
    document.title = d.name ? `Cachorro — ${d.name}` : "Cachorro";
    $("title").textContent = d.name || "Cachorro";

    const img = $("photo");
    img.src = d.photoUrl ? d.photoUrl : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='#fff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#999' font-family='Arial' font-size='12'>Sem foto</text></svg>`);

    $("dogInfo").innerHTML = `
      <div><b>Tutor:</b> <a href="customer.html?id=${encodeURIComponent(d.customerId)}">${escapeHtml(d.customerName||"-")}</a></div>
      <div><b>Raça:</b> ${escapeHtml(d.breed||"-")}</div>
      <div><b>Idade:</b> ${escapeHtml(String(d.ageYears||0))}a ${escapeHtml(String(d.ageMonths||0))}m</div>
      <div><b>Sexo:</b> ${escapeHtml(d.sex||"-")} • <b>Castrado:</b> ${escapeHtml(d.neutered||"-")} • <b>Peso:</b> ${escapeHtml(String(d.weightKg||""))}</div>
      <div><b>Dieta:</b> ${escapeHtml(d.diet||"-")}</div>
      <div><b>Temperamento:</b> ${escapeHtml(d.temperament||"-")}</div>
      <div><b>Vacinas:</b> ${escapeHtml(d.vaccines||"-")}</div>
      <div><b>Antiparasitário:</b> ${escapeHtml(d.parasiteControl||"-")}</div>
    `;

    $("safety").innerHTML = safetyBlock(d);
    renderRegular(r.regular || []);
    renderServices(r.services || []);

    // dialog wiring
    document.querySelectorAll("[data-close]").forEach(btn=>{
      btn.addEventListener("click", ()=> closeDialog(btn.getAttribute("data-close")));
    });

    $("btnAddRegular").addEventListener("click", ()=>{
      $("rgType").value = "creche";
      $("rgPrice").value = defaultPrice("creche");
      $("rgWeekdays").value = "";
      $("rgStart").value = "";
      $("rgEnd").value = "";
      $("rgNotes").value = "";
      openDialog("regularDialog");
    });

    $("rgType").addEventListener("change", ()=> $("rgPrice").value = defaultPrice($("rgType").value));

    $("regularForm").addEventListener("submit", async (e)=>{
      e.preventDefault();
      const payload = {
        dogId: id,
        type: $("rgType").value,
        weekdays: $("rgWeekdays").value.trim(),
        startTime: $("rgStart").value,
        endTime: $("rgEnd").value,
        price: Number($("rgPrice").value||0),
        notes: $("rgNotes").value
      };
      if (!payload.weekdays) return alert("Informe weekdays, ex: 1,3,5");
      const rr = await apiJsonp("addRegularService", payload);
      if (!rr.ok) return alert(rr.error || "Falha ao salvar serviço regular.");
      closeDialog("regularDialog");
      boot();
    });

  }catch(err){
    setAlert(err.message || String(err));
  }
}

boot();
