// HygienicWipeService.js — Serviço: Higienização (wipes)
//
// Mesma estrutura do banho:
// - dogId
// - data e hora
// - statusConclusao e statusPagamento

export class HygienicWipeService {
  constructor(data = {}) {
    this.id = data.id ?? null;

    this.dogId = data.dogId ?? null;

    this.data = data.data ?? "";
    this.hora = data.hora ?? "";

    this.statusConclusao = data.statusConclusao ?? "Agendado";
    this.statusPagamento = data.statusPagamento ?? "Não pago";

    this.validate();
  }

  validate() {
    if (this.id !== null) HygienicWipeService._assertNonEmptyString("id", this.id);

    HygienicWipeService._assertNonEmptyString("dogId", this.dogId);
    HygienicWipeService._assertDateBR("data", this.data);
    HygienicWipeService._assertTimeBR("hora", this.hora);

    HygienicWipeService._assertConclusao("statusConclusao", this.statusConclusao);
    HygienicWipeService._assertPagamento("statusPagamento", this.statusPagamento);
  }

  toJSON() {
    return {
      tipo: "HygienicWipeService",
      id: this.id,
      dogId: this.dogId,
      data: this.data,
      hora: this.hora,
      statusConclusao: this.statusConclusao,
      statusPagamento: this.statusPagamento,
    };
  }

  static fromJSON(obj) {
    return new HygienicWipeService(obj || {});
  }

  // Helpers (repetidos propositalmente para manter o arquivo auto-contido)

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`HygienicWipeService.${field}: não pode ser vazio.`);
    }
  }

  static _assertDateBR(field, s) {
    if (typeof s !== "string" || !/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      throw new Error(`HygienicWipeService.${field}: use DD-MM-AAAA.`);
    }
    const [dd, mm, yyyy] = s.split("-").map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
      throw new Error(`HygienicWipeService.${field}: data inválida.`);
    }
  }

  static _assertTimeBR(field, s) {
    if (typeof s !== "string" || !/^\d{2}h\d{2}m$/.test(s)) {
      throw new Error(`HygienicWipeService.${field}: use XXhYYm.`);
    }
    const m = s.match(/^(\d{2})h(\d{2})m$/);
    const hh = Number(m[1]), min = Number(m[2]);
    if (hh < 0 || hh > 23 || min < 0 || min > 59) {
      throw new Error(`HygienicWipeService.${field}: hora inválida.`);
    }
  }

  static _assertConclusao(field, v) {
    if (v !== "Agendado" && v !== "Concluído") {
      throw new Error(`HygienicWipeService.${field}: use "Agendado" ou "Concluído".`);
    }
  }

  static _assertPagamento(field, v) {
    if (v !== "Não pago" && v !== "Pago") {
      throw new Error(`HygienicWipeService.${field}: use "Não pago" ou "Pago".`);
    }
  }
}
