function badge(text){ return `<span class="badge">${escapeHtml(text)}</span>`; }

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

function labelType(t){
  const m = { creche:"Creche", diaria:"Diária", banho:"Banho", tosa_higienica:"Tosa higiênica", transporte:"Transporte", outro:"Outro" };
  return m[t] || t;
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

async function boot(){
  const id = qs("id");
  if (!id) return alert("Falta ?id=");

  const r1 = await apiJsonp("getDog", { id });
  if (!r1.ok) return alert(r1.error || "Falha ao carregar cachorro.");
  renderDog(r1.dog);

  const r2 = await apiJsonp("listRegularByDog", { dogId: id });
  if (!r2.ok) return alert(r2.error || "Falha ao carregar regulares.");
  renderRegular(r2.regular || []);

  const r3 = await apiJsonp("getDogServices", { dogId: id });
  if (!r3.ok) return alert(r3.error || "Falha ao carregar serviços.");
  renderServices(r3.services || []);
}

boot().catch(e=>alert(e.message||String(e)));
