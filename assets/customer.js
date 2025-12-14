const $ = (id)=>document.getElementById(id);
function setAlert(msg){ $("alerts").innerHTML = `<div class="alert">${escapeHtml(msg)}</div>`; }
function clearAlert(){ $("alerts").innerHTML = ""; }
function qs(name){ return new URLSearchParams(location.search).get(name); }

function labelTipo(type){
  return ({creche:"Creche",diaria:"Diária (hotel)",banho:"Banho",tosa_higienica:"Tosa higiênica",transporte:"Transporte",outro:"Outro"})[type] || type;
}

function renderDogs(list){
  const root = $("dogsList");
  root.innerHTML = "";
  if (!list.length){
    root.innerHTML = `<div class="alert">Nenhum cachorro cadastrado.</div>`;
    return;
  }
  for (const d of list){
    const el = document.createElement("div");
    el.className = "event";
    el.innerHTML = `
      <div class="event__title">${escapeHtml(d.name||"Cachorro")}</div>
      <div class="event__meta">${escapeHtml(d.breed||"-")} • ${escapeHtml(String(d.ageYears||0))}a ${escapeHtml(String(d.ageMonths||0))}m</div>
      <div class="badges">
        <span class="badge"><a href="dog.html?id=${encodeURIComponent(d.id)}">Abrir ficha</a></span>
      </div>
    `;
    root.appendChild(el);
  }
}

function renderServices(list){
  const root = $("servicesList");
  root.innerHTML = "";
  if (!list.length){
    root.innerHTML = `<div class="alert">Nenhum serviço ainda.</div>`;
    return;
  }
  for (const s of list.slice().reverse()){
    const el = document.createElement("div");
    el.className = "event";
    el.innerHTML = `
      <div class="event__title">${escapeHtml(labelTipo(s.type))} — ${escapeHtml(s.dogName||"")}</div>
      <div class="event__meta">${escapeHtml(s.date)}${s.startTime? " • "+escapeHtml(s.startTime):""} • ${escapeHtml(s.operStatus||"aberto")}</div>
      <div class="badges">
        <span class="badge">${escapeHtml(moneyBR(s.price||0))}</span>
      </div>
    `;
    root.appendChild(el);
  }
}

async function boot(){
  clearAlert();
  const id = qs("id");
  if (!id) return setAlert("ID do cliente não informado.");

  try{
    const r = await apiJsonp("getCustomer", { id });
    if (!r.ok) throw new Error(r.error || "Falha ao carregar cliente.");

    const c = r.customer;
    document.title = c.name ? `Cliente — ${c.name}` : "Cliente";
    $("title").textContent = c.name || "Cliente";

    $("custInfo").innerHTML = `
      <div><b>WhatsApp:</b> ${escapeHtml(c.whatsapp||"-")}</div>
      <div><b>Email:</b> ${escapeHtml(c.email||"-")}</div>
      <div><b>Endereço:</b> ${escapeHtml(c.address||"-")}</div>
      <div><b>Notas:</b> ${escapeHtml(c.notes||"-")}</div>
    `;

    renderDogs(r.dogs || []);
    renderServices(r.services || []);
  }catch(err){
    setAlert(err.message || String(err));
  }
}

boot();

