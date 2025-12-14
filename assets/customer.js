let _customer = null;

function badge(text){ return `<span class="badge">${escapeHtml(text)}</span>`; }

function labelType(t){
  const m = { creche:"Creche", diaria:"Diária", banho:"Banho", tosa_higienica:"Tosa higiênica", transporte:"Transporte", outro:"Outro" };
  return m[t] || t;
}

function openDialog(id){ $(id).showModal(); }
function closeDialog(id){ $(id).close(); }

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

function wireEditCustomer(){
  $("btnCancelCustomerEdit").addEventListener("click", ()=> closeDialog("customerEditDialog"));

  $("btnEditCustomer").addEventListener("click", ()=>{
    if (!_customer) return;

    $("ecName").value = _customer.name || "";
    $("ecWhatsapp").value = _customer.whatsapp || "";
    $("ecEmail").value = _customer.email || "";
    $("ecAddress").value = _customer.address || "";
    $("ecCreditCreche").value = Number(_customer.creditCreche || 0);
    $("ecCreditTransp").value = Number(_customer.creditTransp || 0);
    $("ecCreditBanho").value = Number(_customer.creditBanho || 0);

    openDialog("customerEditDialog");
  });

  $("customerEditForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    if (!_customer) return;

    const payload = {
      id: _customer.id,
      name: $("ecName").value.trim(),
      whatsapp: $("ecWhatsapp").value.trim(),
      email: $("ecEmail").value.trim(),
      address: $("ecAddress").value.trim(),
      creditCreche: Number($("ecCreditCreche").value || 0),
      creditTransp: Number($("ecCreditTransp").value || 0),
      creditBanho: Number($("ecCreditBanho").value || 0),
    };

    const r = await apiJsonp("updateCustomer", payload);
    if (!r.ok) return alert(r.error || "Falha ao atualizar cliente.");

    closeDialog("customerEditDialog");
    await boot();
  });
}

async function boot(){
  const id = qs("id");
  if (!id) return alert("Falta ?id=");

  const r1 = await apiJsonp("getCustomer", { id });
  if (!r1.ok) return alert(r1.error || "Falha ao carregar cliente.");

  _customer = r1.customer;

  // services can come either from getCustomer() or getCustomerServices()
  renderCustomer(r1.customer);
  renderServices(r1.services || []);
}

wireEditCustomer();
boot().catch(e=>alert(e.message||String(e)));
