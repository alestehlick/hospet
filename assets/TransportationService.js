// TransportationService.js — Serviço: Transporte
//
// IMPORTANTE:
// - `tipo` no JSON é reservado para o tipo do objeto (ex.: "TransportationService").
// - A direção do transporte fica em `direcao`.
//
// Direção aceita (entrada):
// - "Para o hotel" (qualquer capitalização, com espaços extras)
// - "De volta para casa" (idem)
// - "ToHotel" / "BackHome" (como você escreveu originalmente)
// - "to_hotel" / "back_home" (variações comuns)
//
// Direção armazenada (saída / padrão interno):
// - sempre será "Para o hotel" OU "De volta para casa"

export class TransportationService {
  constructor(data = {}) {
    this.id = data.id ?? null;

    this.dogId = data.dogId ?? null;

    // Aceitamos alguns nomes por compatibilidade:
    // - direcao (novo padrão)
    // - tipoTransporte (legado)
    // - transportationType (se você usar em algum lugar)
    const rawDirecao =
      data.direcao ??
      data.tipoTransporte ??
      data.transportationType ??
      "";

    // Normalizamos para um valor canônico PT-BR
    this.direcao = TransportationService._normalizeDirecao(rawDirecao);

    this.data = data.data ?? "";

    this.statusConclusao = data.statusConclusao ?? "Agendado";
    this.statusPagamento = data.statusPagamento ?? "Não pago";

    this.validate();
  }

  validate() {
    if (this.id !== null) TransportationService._assertNonEmptyString("id", this.id);

    TransportationService._assertNonEmptyString("dogId", this.dogId);

    // Aqui, em vez de exigir que a entrada já venha perfeita,
    // nós garantimos que após normalização ela ficou em um valor permitido.
    TransportationService._assertDirecao("direcao", this.direcao);

    TransportationService._assertDateBR("data", this.data);

    TransportationService._assertConclusao("statusConclusao", this.statusConclusao);
    TransportationService._assertPagamento("statusPagamento", this.statusPagamento);
  }

  toJSON() {
    return {
      tipo: "TransportationService",
      id: this.id,
      dogId: this.dogId,
      direcao: this.direcao, // sempre canônico PT-BR
      data: this.data,
      statusConclusao: this.statusConclusao,
      statusPagamento: this.statusPagamento,
    };
  }

  static fromJSON(obj) {
    // Se vier JSON legado, aceitamos e normalizamos no constructor.
    return new TransportationService(obj || {});
  }

  // ------------------ helpers estruturais ------------------

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`TransportationService.${field}: não pode ser vazio.`);
    }
  }

  static _normalizeDirecao(v) {
    // Normaliza entrada livre -> valores canônicos PT-BR
    // Se não reconhecer, devolve string original (para a validação falhar com mensagem clara).

    if (typeof v !== "string") return "";

    // tira espaços extras e padroniza pra comparação
    const s = v.trim();

    // comparação “case-insensitive” + alguns formatos comuns
    const key = s
      .toLowerCase()
      .replace(/\s+/g, " ")     // múltiplos espaços -> 1
      .replace(/[_-]+/g, "");   // "_" "-" -> remove (ex.: to_hotel -> tohotel)

    // Aceita PT-BR
    if (key === "para o hotel" || key === "paraohotel") return "Para o hotel";
    if (key === "de volta para casa" || key === "devoltaparacasa") return "De volta para casa";

    // Aceita o seu formato original (ToHotel / BackHome)
    if (key === "tohotel") return "Para o hotel";
    if (key === "backhome") return "De volta para casa";

    // Não reconheceu -> retorna como está (vai falhar no assertDirecao)
    return s;
  }

  static _assertDirecao(field, v) {
    if (typeof v !== "string") {
      throw new Error(`TransportationService.${field}: deve ser texto.`);
    }
    const vv = v.trim();
    const allowed = new Set(["Para o hotel", "De volta para casa"]);
    if (!allowed.has(vv)) {
      throw new Error(
        `TransportationService.${field}: valor inválido. Use "Para o hotel" ou "De volta para casa".`
      );
    }
  }

  static _assertDateBR(field, s) {
    if (typeof s !== "string" || !/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      throw new Error(`TransportationService.${field}: use DD-MM-AAAA.`);
    }
    const [dd, mm, yyyy] = s.split("-").map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
      throw new Error(`TransportationService.${field}: data inválida.`);
    }
  }

  static _assertConclusao(field, v) {
    if (v !== "Agendado" && v !== "Concluído") {
      throw new Error(`TransportationService.${field}: use "Agendado" ou "Concluído".`);
    }
  }

  static _assertPagamento(field, v) {
    if (v !== "Não pago" && v !== "Pago") {
      throw new Error(`TransportationService.${field}: use "Não pago" ou "Pago".`);
    }
  }
}
