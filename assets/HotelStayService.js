// HotelStayService.js — Serviço: Hotel/Estadia
//
// Estrutura (MVP, como você descreveu):
// - dogId
// - data (DD-MM-AAAA) sem hora
// - statusConclusao e statusPagamento
//
// Nota: hotel normalmente exige intervalo (entrada/saída).
// Mas isso é regra de negócio/estrutura futura. Aqui seguimos seu desenho atual.

export class HotelStayService {
  constructor(data = {}) {
    this.id = data.id ?? null;

    this.dogId = data.dogId ?? null;

    this.data = data.data ?? "";

    this.statusConclusao = data.statusConclusao ?? "Agendado";
    this.statusPagamento = data.statusPagamento ?? "Não pago";

    this.validate();
  }

  validate() {
    if (this.id !== null) HotelStayService._assertNonEmptyString("id", this.id);

    HotelStayService._assertNonEmptyString("dogId", this.dogId);
    HotelStayService._assertDateBR("data", this.data);

    HotelStayService._assertConclusao("statusConclusao", this.statusConclusao);
    HotelStayService._assertPagamento("statusPagamento", this.statusPagamento);
  }

  toJSON() {
    return {
      tipo: "HotelStayService",
      id: this.id,
      dogId: this.dogId,
      data: this.data,
      statusConclusao: this.statusConclusao,
      statusPagamento: this.statusPagamento,
    };
  }

  static fromJSON(obj) {
    return new HotelStayService(obj || {});
  }

  // Helpers

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`HotelStayService.${field}: não pode ser vazio.`);
    }
  }

  static _assertDateBR(field, s) {
    if (typeof s !== "string" || !/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      throw new Error(`HotelStayService.${field}: use DD-MM-AAAA.`);
    }
    const [dd, mm, yyyy] = s.split("-").map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
      throw new Error(`HotelStayService.${field}: data inválida.`);
    }
  }

  static _assertConclusao(field, v) {
    if (v !== "Agendado" && v !== "Concluído") {
      throw new Error(`HotelStayService.${field}: use "Agendado" ou "Concluído".`);
    }
  }

  static _assertPagamento(field, v) {
    if (v !== "Não pago" && v !== "Pago") {
      throw new Error(`HotelStayService.${field}: use "Não pago" ou "Pago".`);
    }
  }
}
