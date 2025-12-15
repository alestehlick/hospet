// TransportationService.js — Serviço: Transporte
//
// IMPORTANTE:
// - O campo `tipo` no JSON é reservado para o "tipo do objeto" (ex.: "TransportationService").
// - Portanto, a "direção" do transporte NÃO pode se chamar `tipo`.
// - Aqui usamos `direcao`: "Para o hotel" | "De volta para casa".
//
// Estrutura:
// - dogId: id do cão (obrigatório)
// - direcao: "Para o hotel" ou "De volta para casa" (obrigatório)
// - data: "DD-MM-AAAA" (obrigatório)
// - statusConclusao: "Agendado" | "Concluído"
// - statusPagamento: "Não pago" | "Pago"

export class TransportationService {
  constructor(data = {}) {
    // id pode ser null por enquanto (store gera)
    this.id = data.id ?? null;

    // ligação com o cão
    this.dogId = data.dogId ?? null;

    // direção do transporte (campo correto, sem conflito)
    // aceitamos também `tipoTransporte` por compatibilidade (se você já tiver JSON salvo)
    this.direcao = data.direcao ?? data.tipoTransporte ?? "";

    // data do transporte
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
    // JSON SEM conflito:
    // - tipo = tipo do objeto
    // - direcao = direção do transporte
    return {
      tipo: "TransportationService",
      id: this.id,
      dogId: this.dogId,
      direcao: this.direcao,
      data: this.data,
      statusConclusao: this.statusConclusao,
      statusPagamento: this.statusPagamento,
    };
  }

  static fromJSON(obj) {
    // Compatibilidade:
    // se um JSON antigo tiver `tipoTransporte`, convertemos para `direcao`.
    const normalized = { ...(obj || {}) };
    if (typeof normalized.direcao !== "string" && typeof normalized.tipoTransporte === "string") {
      normalized.direcao = normalized.tipoTransporte;
    }
    return new TransportationService(normalized);
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
