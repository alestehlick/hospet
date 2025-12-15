// TransportationService.js — Serviço: Transporte
//
// IMPORTANTE:
// - `tipo` no JSON é reservado para o tipo do objeto (ex.: "TransportationService").
// - A direção do transporte fica em `direcao`.
//
// Direção aceita (entrada) — SOMENTE EM PORTUGUÊS:
// - "Para o Hotel"
// - "Para Casa"
//
// Direção armazenada:
// - exatamente "Para o Hotel" OU "Para Casa" (sem normalização para inglês)

export class TransportationService {
  constructor(data = {}) {
    this.id = data.id ?? null;

    this.dogId = data.dogId ?? null;

    // Aceitamos somente nomes em português para o campo.
    // (Mantemos compatibilidade apenas com `tipoTransporte`, que também é português.)
    this.direcao = data.direcao ?? data.tipoTransporte ?? "";

    this.data = data.data ?? "";

    this.statusConclusao = data.statusConclusao ?? "Agendado";
    this.statusPagamento = data.statusPagamento ?? "Não pago";

    this.validate();
  }

  validate() {
    if (this.id !== null) TransportationService._assertNonEmptyString("id", this.id);

    TransportationService._assertNonEmptyString("dogId", this.dogId);
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
      direcao: this.direcao, // "Para o Hotel" | "Para Casa"
      data: this.data,
      statusConclusao: this.statusConclusao,
      statusPagamento: this.statusPagamento,
    };
  }

  static fromJSON(obj) {
    // Se vier um JSON legado com `tipoTransporte`, ainda aceitamos (português).
    return new TransportationService(obj || {});
  }

  // ------------------ helpers estruturais ------------------

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`TransportationService.${field}: não pode ser vazio.`);
    }
  }

  static _assertDirecao(field, v) {
    if (typeof v !== "string") {
      throw new Error(`TransportationService.${field}: deve ser texto.`);
    }

    // Regra estrita: SOMENTE dois valores (case-sensitive).
    if (v !== "Para o Hotel" && v !== "Para Casa") {
      throw new Error(
        `TransportationService.${field}: valor inválido. Use "Para o Hotel" ou "Para Casa".`
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
