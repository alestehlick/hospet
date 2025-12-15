// localStore.js — Persistência local (MVP) com localStorage
//
// Objetivo:
// - Guardar e recuperar Customer, Dog, Services e Task do localStorage.
// - Garantir que tudo que é salvo é estruturalmente válido:
//     -> ao salvar, reconstruímos com construirObjeto() (que valida).
// - Indexação por id:
//     -> se vier sem id, geramos um automaticamente (necessário para atualizar/remover).
//
// O que este arquivo NÃO faz (por enquanto):
// - Não aplica leis relacionais/negócio (ex.: "customerId existe?").
// - Não atualiza historicos (servicoIds etc) automaticamente.
//   (isso virá depois, nas regras de negócio).

import { construirObjeto, serializarObjeto } from "./typeRegistry.js";

// ------------------------------------------------------------
// 1) Chaves de storage (um "banco" simples por coleção)
// ------------------------------------------------------------
//
// Cada coleção guarda um MAPA (objeto) no formato:
// {
//   "<id1>": { ...json... },
//   "<id2>": { ...json... }
// }
//
// Isso facilita update/delete sem varrer arrays enormes.

const KEY_CLIENTES = "HB_CLIENTES_V1";
const KEY_CAES = "HB_CAES_V1";
const KEY_SERVICOS = "HB_SERVICOS_V1";
const KEY_TAREFAS = "HB_TAREFAS_V1";

// ------------------------------------------------------------
// 2) Regras simples: qual tipo vai para qual coleção?
// ------------------------------------------------------------

function keyPorTipo_(tipo) {
  switch (tipo) {
    case "Customer":
      return KEY_CLIENTES;
    case "Dog":
      return KEY_CAES;
    case "Task":
      return KEY_TAREFAS;
    default:
      // qualquer outro "tipo" que não seja Customer/Dog/Task, tratamos como serviço
      return KEY_SERVICOS;
  }
}

// ------------------------------------------------------------
// 3) API principal (o que você usará no site)
// ------------------------------------------------------------

// Salva (cria ou atualiza) uma entidade.
// Aceita instância (com toJSON) ou objeto cru com `tipo`.
// Retorna a instância validada, já com id garantido.
export function salvar(entidade) {
  // 1) Serializa (vira objeto cru)
  let raw = serializarObjeto(entidade);

  // 2) Constrói a instância -> valida leis estruturais
  let inst = construirObjeto(raw);

  // 3) Garante que exista id (para indexar no storage)
  //    (Como sua lei estrutural permite id=null, a geração fica aqui no storage.)
  if (inst.id === null || String(inst.id).trim() === "") {
    inst.id = gerarId_(prefixPorTipo_(inst.toJSON().tipo));
    // Depois de atribuir id, reserializamos
    raw = inst.toJSON();
  } else {
    raw = inst.toJSON();
  }

  // 4) Descobre a coleção correta e persiste
  const key = keyPorTipo_(raw.tipo);
  const mapa = carregarMapa_(key);
  mapa[raw.id] = raw;
  salvarMapa_(key, mapa);

  // 5) Retorna instância (reconstruída do raw final, para garantir consistência)
  return construirObjeto(raw);
}

// Obtém por id e retorna instância (ou null se não existir)
export function obter(tipo, id) {
  const tipoStr = String(tipo || "").trim();
  const idStr = String(id || "").trim();
  if (!tipoStr) throw new Error("obter(tipo,id): tipo é obrigatório.");
  if (!idStr) throw new Error("obter(tipo,id): id é obrigatório.");

  const key = keyPorTipo_(tipoStr);
  const mapa = carregarMapa_(key);
  const raw = mapa[idStr];
  if (!raw) return null;

  return construirObjeto(raw);
}

// Lista tudo de uma coleção por "nome lógico".
// tipoColecao pode ser: "clientes" | "caes" | "servicos" | "tarefas"
export function listar(tipoColecao) {
  const t = String(tipoColecao || "").trim().toLowerCase();

  const key =
    t === "clientes" ? KEY_CLIENTES :
    t === "caes" ? KEY_CAES :
    t === "servicos" ? KEY_SERVICOS :
    t === "tarefas" ? KEY_TAREFAS :
    null;

  if (!key) {
    throw new Error('listar(tipoColecao): use "clientes", "caes", "servicos" ou "tarefas".');
  }

  const mapa = carregarMapa_(key);
  // Converte o mapa em lista de instâncias, já validadas
  return Object.values(mapa).map(construirObjeto);
}

// Remove por tipo e id. Retorna true se removeu, false se não existia.
export function remover(tipo, id) {
  const tipoStr = String(tipo || "").trim();
  const idStr = String(id || "").trim();
  if (!tipoStr) throw new Error("remover(tipo,id): tipo é obrigatório.");
  if (!idStr) throw new Error("remover(tipo,id): id é obrigatório.");

  const key = keyPorTipo_(tipoStr);
  const mapa = carregarMapa_(key);

  if (!mapa[idStr]) return false;
  delete mapa[idStr];
  salvarMapa_(key, mapa);
  return true;
}

// Apaga tudo (útil para testes)
export function limparTudo() {
  localStorage.removeItem(KEY_CLIENTES);
  localStorage.removeItem(KEY_CAES);
  localStorage.removeItem(KEY_SERVICOS);
  localStorage.removeItem(KEY_TAREFAS);
}

// ------------------------------------------------------------
// 4) Conveniências (atalhos úteis, mas não obrigatórios)
// ------------------------------------------------------------

export function listarClientes() { return listar("clientes"); }
export function listarCaes() { return listar("caes"); }
export function listarServicos() { return listar("servicos"); }
export function listarTarefas() { return listar("tarefas"); }

// ------------------------------------------------------------
// 5) Infra interna (carregar/salvar mapas + gerar id)
// ------------------------------------------------------------

function carregarMapa_(key) {
  const txt = localStorage.getItem(key);
  if (!txt) return {}; // vazio

  try {
    const obj = JSON.parse(txt);
    // Esperamos um objeto simples (mapa). Se vier outra coisa, resetamos.
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    return obj;
  } catch (e) {
    // Se o JSON estiver corrompido, não quebramos o app inteiro;
    // devolvemos vazio e você pode decidir depois como lidar.
    console.warn(`localStore: JSON inválido em ${key}. Resetando.`, e);
    return {};
  }
}

function salvarMapa_(key, mapa) {
  localStorage.setItem(key, JSON.stringify(mapa));
}

function prefixPorTipo_(tipo) {
  // Prefixos só para deixar IDs legíveis
  switch (tipo) {
    case "Customer": return "cust";
    case "Dog": return "dog";
    case "Task": return "task";
    default: return "svc";
  }
}

function gerarId_(prefix) {
  // Gera um id único. Usa crypto.randomUUID se existir; se não, usa fallback.
  const uuid = (crypto?.randomUUID?.() ?? fallbackUUID_());
  return `${prefix}_${uuid}`;
}

function fallbackUUID_() {
  // fallback simples (não criptográfico), suficiente para MVP local
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
