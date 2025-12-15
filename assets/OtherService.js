// OtherService.js — Serviço: Outro
//
// Estrutura:
// - dogId
// - data (DD-MM-AAAA)
// - hora (opcional) — você pediu "Date and Time" para a maioria, mas aqui é razoável deixar opcional
// - descricao (obrigatória)
// - statusConclusao e statusPagamento
//
// Leis estruturais:
// - dogId obrigatório
// - data obrigatória e válida
// - descricao obrigatória
// - hora: se preenchida, deve ser válida

export class OtherService {
  constructor(data = {}) {
    this.id = data.id ?? null;

    this.dogId = data.dogId ?? null;

    this.data = data.data ?? "";
    this.hora = data.hora ?? ""; // opcional

    this.descricao = data.descricao ?? "";

    this.statusConclusao = data.statusConclusao ?? "Agendado";
    this.statusPagamento = data.statusPagamento ?? "Não pago";

    this.validate();
  }

  validate() {
    if (this.id !== null) OtherService._assertNonEmptyString("id", this.id);

    OtherService._assertNonEmptyString("dogId", this.dogId);
    OtherService._assertDateBR("data", this.data);

    // descrição é o coração do "Outro serviço": deve existir e ser texto não vazio
    OtherService._assertNonEmptyString("descricao", this.descricao);

    // hora é opcional, mas se vier deve seguir o formato XXhYYm
    if (typeof this.hora !== "string") {
      throw new Error(`OtherService.hora: deve ser texto.`);
    }
    if (this.hora.trim() !== "") {
      OtherService._assertTimeBR("hora", this.hora);
    }

    OtherService._assertConclusao("statusConclusao", this.statusConclusao);
    OtherService._assertPagamento("statusPagamento", this.statusPagamento);
  }

  toJSON() {
    return {
      tipo: "OtherService",
      id: this.id,
      dogId: this.dogId,
      data: this.data,
      hora: this.hora,
      descricao: this.descricao,
      statusConclusao: this.statusConclusao,
      statusPagamento: this.statusPagamento,
    };
  }

  static fromJSON(obj) {
    return new OtherService(obj || {});
  }

  // Helpers

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`OtherService.${field}: não pode ser vazio.`);
    }
  }

  static _assertDateBR(field, s) {
    if (typeof s !== "string" || !/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      throw new Error(`OtherService.${field}: use DD-MM-AAAA.`);
    }
    const [dd, mm, yyyy] = s.split("-").map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
      throw new Error(`OtherService.${field}: data inválida.`);
    }
  }

  static _assertTimeBR(field, s) {
    if (typeof s !== "string" || !/^\d{2}h\d{2}m$/.test(s)) {
      throw new Error(`OtherService.${field}: use XXhYYm.`);
    }
    const m = s.match(/^(\d{2})h(\d{2})m$/);
    const hh = Number(m[1]), min = Number(m[2]);
    if (hh < 0 || hh > 23 || min < 0 || min > 59) {
      throw new Error(`OtherService.${field}: hora inválida.`);
    }
  }

  static _assertConclusao(field, v) {
    if (v !== "Agendado" && v !== "Concluído") {
      throw new Error(`OtherService.${field}: use "Agendado" ou "Concluído".`);
    }
  }

  static _assertPagamento(field, v) {
    if (v !== "Não pago" && v !== "Pago") {
      throw new Error(`OtherService.${field}: use "Não pago" ou "Pago".`);
    }
  }
}
