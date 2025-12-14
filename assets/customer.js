function badge(text){ return `<span class="badge">${escapeHtml(text)}</span>`; }

function labelType(t){
  const m = { creche:"Creche", diaria:"Diária", banho:"Banho", tosa_higienica:"Tosa higiênica", transporte:"Transporte", outro:"Outro" };
  return m[t] || t;
}

function renderCustomer(c){
  $("title").textContent = c.name ? `Cliente — ${c.name}` : "Cliente";
  $("subtitle").textContent = c.whatsapp ? `WhatsApp: ${c.whatsapp}` : "";

  $("custCard").innerHTML = `
    <div class="section-title">Dados</div>
    <div class="sub">Email: ${escapeHtml(c.email || "-")}</div>
    <div class="sub">Endereço: ${escapeHtml(c.address || "-")}</div>
    <hr class="sep"/>
    <div class="sub"><b>Créditos:</b> creche ${escapeHtml(c.creditCreche||0)} • transporte ${escapeHtml(c.creditTransp||0)} • banho ${escapeHtml(c.creditBanho||0)}</div>
  `;
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
    el.className = "event bg-hotelOpen";
    el.innerHTML = `
      <div class="event__title">${escapeHtml(labelType(s.type))} — ${escapeHtml(s.dogName || "Cachorro")}</div>
      <div class="event__meta">${escapeHtml(s.date || "")} ${s.source==="regular" ? "• Regular" : ""}</div>
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

  const r = await apiJsonp("getCustomer", { id });
  if (!r.ok) return alert(r.error || "Falha ao carregar cliente.");

  renderCustomer(r.customer);
  renderServices(r.services || []);
}

boot().catch(e=>alert(e.message||String(e)));
