// DayCareService.js — Serviço: Creche (Daycare)
//
// Estrutura:
// - dogId
// - data (DD-MM-AAAA) sem hora (como você descreveu)
// - statusConclusao e statusPagamento

export class DayCareService {
  constructor(data = {}) {
    this.id = data.id ?? null;

    this.dogId = data.dogId ?? null;

    this.data = data.data ?? ""; // sem hora

    this.statusConclusao = data.statusConclusao ?? "Agendado";
    this.statusPagamento = data.statusPagamento ?? "Não pago";

    this.validate();
  }

  validate() {
    if (this.id !== null) DayCareService._assertNonEmptyString("id", this.id);

    DayCareService._assertNonEmptyString("dogId", this.dogId);
    DayCareService._assertDateBR("data", this.data);

    DayCareService._assertConclusao("statusConclusao", this.statusConclusao);
    DayCareService._assertPagamento("statusPagamento", this.statusPagamento);
  }

  toJSON() {
    return {
      tipo: "DayCareService",
      id: this.id,
      dogId: this.dogId,
      data: this.data,
      statusConclusao: this.statusConclusao,
      statusPagamento: this.statusPagamento,
    };
  }

  static fromJSON(obj) {
    return new DayCareService(obj || {});
  }

  // Helpers

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`DayCareService.${field}: não pode ser vazio.`);
    }
  }

  static _assertDateBR(field, s) {
    if (typeof s !== "string" || !/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      throw new Error(`DayCareService.${field}: use DD-MM-AAAA.`);
    }
    const [dd, mm, yyyy] = s.split("-").map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
      throw new Error(`DayCareService.${field}: data inválida.`);
    }
  }

  static _assertConclusao(field, v) {
    if (v !== "Agendado" && v !== "Concluído") {
      throw new Error(`DayCareService.${field}: use "Agendado" ou "Concluído".`);
    }
  }

  static _assertPagamento(field, v) {
    if (v !== "Não pago" && v !== "Pago") {
      throw new Error(`DayCareService.${field}: use "Não pago" ou "Pago".`);
    }
  }
}
