// TransportationService.js — Serviço: Transporte (estrito)
//
// Regra que você definiu:
// - direcao só pode ser exatamente:
//   1) "Para o Hotel"
//   2) "Para Casa"
//
// IMPORTANTE:
// - O campo `tipo` é reservado para o tipo do objeto no JSON (ex.: "TransportationService").
// - Por isso, a direção fica em `direcao` (não em `tipo`).

export class TransportationService {
  constructor(data = {}) {
    // id pode ser null; o localStore gera se faltar
    this.id = data.id ?? null;

    // ligação com o cão
    this.dogId = data.dogId ?? null;

    // direção do transporte (estrita)
    // aceitamos apenas `direcao` (nada de sinônimos/normalização agora)
    this.direcao = data.direcao ?? "";

    // data do transporte (DD-MM-AAAA)
    this.data = data.data ?? "";

    // status
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
    // Sem compatibilidade automática: se vier diferente, falha (como você quer).
    return new TransportationService(obj || {});
  }

  // ------------------ helpers estruturais ------------------

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`Transpo
