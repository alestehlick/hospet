// assets/demoTests.js — Testes manuais (MVP)
//
// Estrutura do seu repo (como você descreveu):
// /assets
//   Customer.js
//   Dog.js
//   BathService.js
//   ...
//   typeRegistry.js
//   localStore.js
//   demoTests.js
//
// Como rodar:
// - Crie um index.html na raiz do repo (vou te dar abaixo).
// - Abra o site (GitHub Pages ou servidor local).
// - Veja o console (F12) para resultados.

import { Customer } from "./Customer.js";
import { Dog } from "./Dog.js";

import { BathService } from "./BathService.js";
import { HygienicWipeService } from "./HygienicWipeService.js";
import { DayCareService } from "./DayCareService.js";
import { HotelStayService } from "./HotelStayService.js";
import { OtherService } from "./OtherService.js";
import { TransportationService } from "./TransportationService.js";

import { Task } from "./Task.js";

import {
  salvar,
  obter,
  listarClientes,
  listarCaes,
  listarServicos,
  listarTarefas,
  remover,
  limparTudo,
} from "./localStore.js";

// ---------- utilitários de teste ----------

function assert_(cond, msg) {
  if (!cond) throw new Error("ASSERT FALHOU: " + msg);
}

function deveFalhar_(fn, trechoMensagem) {
  let ok = false;
  try {
    fn();
  } catch (e) {
    ok = true;
    if (trechoMensagem) {
      const m = String(e?.message || e);
      assert_(m.includes(trechoMensagem), `Mensagem não contém "${trechoMensagem}". Mensagem: ${m}`);
    }
  }
  assert_(ok, "Era esperado falhar, mas não falhou.");
}

function banner_(titulo) {
  console.log("\n============================================================");
  console.log(titulo);
  console.log("============================================================");
}

// ---------- testes principais ----------

export function runAllTests({ resetarStorage = true } = {}) {
  banner_("INÍCIO DOS TESTES — Estruturas + leis estruturais + localStore");

  if (resetarStorage) {
    banner_("Limpando localStorage (limparTudo)");
    limparTudo();
  }

  // 1) Customer + Dog válidos
  banner_("1) Criando e salvando Customer e Dog (válidos)");

  const c1 = new Customer({
    nome: "Mariana Silva",
    telefoneWhatsApp: "(11) 91234-5678",
    email: "mariana@email.com",
    endereco: "Rua Exemplo, 123 — São Paulo/SP",
    creditosCreche: 5,
    creditosTransporte: 2,
    creditosBanho: 3,
    dogIds: [],
    servicoIds: [],
  });

  const c1Saved = salvar(c1);
  console.log("Customer salvo:", c1Saved);
  assert_(c1Saved.id && typeof c1Saved.id === "string", "Customer deveria ter id gerado pelo store.");

  const d1 = new Dog({
    nome: "Bidu",
    raca: "Vira-lata",
    dataNascimento: "01-02-2020",
    customerId: c1Saved.id,
    notasTemperamento: "Dócil, mas tem medo de secador.",
    servicoIds: [],
  });

  const d1Saved = salvar(d1);
  console.log("Dog salvo:", d1Saved);
  assert_(d1Saved.id && typeof d1Saved.id === "string", "Dog deveria ter id gerado pelo store.");

  // 2) Serviços válidos
  banner_("2) Criando e salvando Serviços (válidos)");

  const sBanhoSaved = salvar(new BathService({
    dogId: d1Saved.id,
    data: "15-12-2025",
    hora: "10h30m",
    statusConclusao: "Agendado",
    statusPagamento: "Não pago",
  }));

  const sHigSaved = salvar(new HygienicWipeService({
    dogId: d1Saved.id,
    data: "16-12-2025",
    hora: "09h00m",
    statusConclusao: "Agendado",
    statusPagamento: "Pago",
  }));

  const sCrecheSaved = salvar(new DayCareService({
    dogId: d1Saved.id,
    data: "17-12-2025",
    statusConclusao: "Agendado",
    statusPagamento: "Não pago",
  }));

  const sHotelSaved = salvar(new HotelStayService({
    dogId: d1Saved.id,
    data: "18-12-2025",
    statusConclusao: "Agendado",
    statusPagamento: "Pago",
  }));

  const sOutroSaved = salvar(new OtherService({
    dogId: d1Saved.id,
    data: "19-12-2025",
    hora: "14h15m",
    descricao: "Aplicar remédio tópico conforme orientação do tutor.",
    statusConclusao: "Agendado",
    statusPagamento: "Não pago",
  }));

const sTranspSaved = salvar(new TransportationService({
  dogId: d1Saved.id,
  direcao: "Para o Hotel",   // <- EXATO
  data: "18-12-2025",
  statusConclusao: "Agendado",
  statusPagamento: "Não pago",
}));


  console.log("Serviços salvos:", {
    banho: sBanhoSaved, hig: sHigSaved, creche: sCrecheSaved,
    hotel: sHotelSaved, outro: sOutroSaved, transp: sTranspSaved
  });

  // 3) Task válida
  banner_("3) Criando e salvando Task (válida)");

  const t1Saved = salvar(new Task({
    titulo: "Comprar shampoo hipoalergênico",
    data: "15-12-2025",
    statusConclusao: "Agendado",
    descricao: "Verificar também toalhas extras.",
  }));

  console.log("Task salva:", t1Saved);

  // 4) Listagem + checagem de classes
  banner_("4) Listando do storage e checando tipos/classes");

  const clientes = listarClientes();
  const caes = listarCaes();
  const servicos = listarServicos();
  const tarefas = listarTarefas();

  console.log("Clientes:", clientes);
  console.log("Cães:", caes);
  console.log("Serviços:", servicos);
  console.log("Tarefas:", tarefas);

  assert_(clientes[0] instanceof Customer, "Cliente deveria ser instância de Customer.");
  assert_(caes[0] instanceof Dog, "Cão deveria ser instância de Dog.");
  assert_(tarefas[0] instanceof Task, "Tarefa deveria ser instância de Task.");

  assert_(servicos.some(s => s instanceof BathService), "Deveria existir BathService listado.");
  assert_(servicos.some(s => s instanceof TransportationService), "Deveria existir TransportationService listado.");

  // 5) obter + remover
  banner_("5) Obter por id e remover");

  const banhoObtido = obter("BathService", sBanhoSaved.id);
  console.log("Banho obtido:", banhoObtido);
  assert_(banhoObtido instanceof BathService, "obter() deveria reconstruir BathService.");

  const removeu = remover("BathService", sBanhoSaved.id);
  console.log("Removeu banho?", removeu);
  assert_(removeu === true, "Deveria remover o banho.");

  assert_(obter("BathService", sBanhoSaved.id) === null, "Após remover, obter() deveria retornar null.");

  // 6) testes de falha (leis estruturais)
  banner_("6) Testes de falha — leis estruturais");

  deveFalhar_(() => new Dog({ nome: "", customerId: c1Saved.id }), "Dog.nome");
  deveFalhar_(() => new Dog({ nome: "Rex", customerId: "" }), "Dog.customerId");

  deveFalhar_(
    () => new BathService({ dogId: d1Saved.id, data: "2025-12-15", hora: "10h30m" }),
    "use DD-MM-AAAA"
  );

  deveFalhar_(
    () => new BathService({ dogId: d1Saved.id, data: "15-12-2025", hora: "25h00m" }),
    "hora inválida"
  );

  deveFalhar_(
    () => new TransportationService({ dogId: d1Saved.id, tipo: "Ir ao shopping", data: "15-12-2025" }),
    "valor inválido"
  );

  deveFalhar_(
    () => new OtherService({ dogId: d1Saved.id, data: "15-12-2025", descricao: "" }),
    "OtherService.descricao"
  );

  deveFalhar_(
    () => new Task({ titulo: "Teste", data: "15-12-2025", statusConclusao: "Feito" }),
    'use "Agendado" ou "Concluído"'
  );

  banner_("FIM DOS TESTES — Tudo OK ✅");
  console.log("Se você viu 'Tudo OK ✅', seu núcleo + store está funcionando.");
}

// Se você quiser rodar automaticamente ao abrir a página, deixe assim:
runAllTests({ resetarStorage: true });
