// typeRegistry.js — Registro de tipos (roteador/fábrica)
//
// Por que existe:
// - Quando você lê um JSON do armazenamento, ele vira um "objeto cru" (plain object).
// - Mas nós queremos reconstituir a CLASSE correta (Dog, Customer, BathService etc).
// - Para isso, cada JSON tem um campo `tipo` (ex.: "Dog", "BathService").
// - Este arquivo centraliza a lógica: "se tipo == X, use a classe X".
//
// Vantagens:
// - A UI e o storage não precisam conhecer detalhes de todas as classes.
// - Você adiciona um novo tipo e só ajusta aqui.

import { Customer } from "./Customer.js";
import { Dog } from "./Dog.js";

import { BathService } from "./BathService.js";
import { HygienicWipeService } from "./HygienicWipeService.js";
import { DayCareService } from "./DayCareService.js";
import { HotelStayService } from "./HotelStayService.js";
import { OtherService } from "./OtherService.js";
import { TransportationService } from "./TransportationService.js";

import { Task } from "./Task.js";

// Mapa: string do campo `tipo` -> classe correspondente
const TYPE_MAP = Object.freeze({
  Customer,
  Dog,

  BathService,
  HygienicWipeService,
  DayCareService,
  HotelStayService,
  OtherService,
  TransportationService,

  Task,
});

// Lista de tipos conhecidos (útil para erros e debug)
export function tiposConhecidos() {
  return Object.keys(TYPE_MAP);
}

// Retorna true/false se um `tipo` é suportado
export function isTipoConhecido(tipo) {
  return Boolean(TYPE_MAP[String(tipo || "")]);
}

// Dado um objeto cru (lido do JSON), reconstrói a instância da classe correta.
// - Se `tipo` não existir ou for desconhecido, lança erro.
// - Ao reconstruir via fromJSON(), a classe chama validate() no construtor.
export function construirObjeto(objCru) {
  if (!objCru || typeof objCru !== "object") {
    throw new Error("typeRegistry: objeto inválido (esperado objeto).");
  }

  const tipo = String(objCru.tipo || "").trim();
  if (!tipo) {
    throw new Error('typeRegistry: JSON sem campo "tipo".');
  }

  const Cls = TYPE_MAP[tipo];
  if (!Cls) {
    throw new Error(
      `typeRegistry: tipo desconhecido "${tipo}". Tipos suportados: ${tiposConhecidos().join(", ")}`
    );
  }

  // Usa o fromJSON() da própria classe.
  // Isso garante que validate() será chamado.
  return Cls.fromJSON(objCru);
}

// O inverso: transforma uma instância (ou objeto com toJSON) num JSON cru.
export function serializarObjeto(instanciaOuObj) {
  if (!instanciaOuObj) throw new Error("typeRegistry: nada para serializar.");

  // Se for instância com toJSON()
  if (typeof instanciaOuObj.toJSON === "function") {
    return instanciaOuObj.toJSON();
  }

  // Se for objeto cru, aceitamos, mas exigimos `tipo` (para consistência)
  if (typeof instanciaOuObj === "object") {
    if (!instanciaOuObj.tipo) {
      throw new Error('typeRegistry: objeto cru sem campo "tipo" não pode ser serializado.');
    }
    return instanciaOuObj;
  }

  throw new Error("typeRegistry: formato inválido para serialização.");
}
