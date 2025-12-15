// BathService.js — Serviço: Banho
//
// Estrutura (como você definiu):
// - ligado a 1 Dog (dogId)
// - data (DD-MM-AAAA) e hora (XXhYYm)
// - status de conclusão: "Agendado" | "Concluído"
// - status de pagamento: "Não pago" | "Pago"
//
// Leis estruturais aqui:
// - dogId obrigatório (string não vazia)
// - data obrigatória e no formato DD-MM-AAAA
// - hora obrigatória e no formato XXhYYm
// - statusConclusao e statusPagamento só podem assumir valores permitidos

export class BathService {
  constructor(data = {}) {
    // id pode ser null por enquanto (você ainda não definiu geração de id)
    this.id = data.id ?? null;

    // ligação com o cão
    this.dogId = data.dogId ?? null;

    // data/hora do serviço
    this.data = data.data ?? ""; // "DD-MM-AAAA"
    this.hora = data.hora ?? ""; // "XXhYYm"

    // status (com valores padrão)
    this.statusConclusao = data.statusConclusao ?? "Agendado";
    this.statusPagamento = data.statusPagamento ?? "Não pago";

    // valida tudo ao construir
    this.validate();
  }

  validate() {
    // id: se existir, deve ser string não vazia
    if (this.id !== null) BathService._assertNonEmptyString("id", this.id);

    // dogId é obrigatório
    BathService._assertNonEmptyString("dogId", this.dogId);

    // data/hora obrigatórias e em formato correto
    BathService._assertDateBR("data", this.data);
    BathService._assertTimeBR("hora", this.hora);

    // status dentro do domínio permitido
    BathService._assertConclusao("statusConclusao", this.statusConclusao);
    BathService._assertPagamento("statusPagamento", this.statusPagamento);
  }

  toJSON() {
    // objeto literal pronto para salvar em JSON
    return {
      tipo: "BathService",
      id: this.id,
      dogId: this.dogId,
      data: this.data,
      hora: this.hora,
      statusConclusao: this.statusConclusao,
      statusPagamento: this.statusPagamento,
    };
  }

  static fromJSON(obj) {
    // reconstrói e valida
    return new BathService(obj || {});
  }

  // ------------------ helpers estruturais ------------------

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`BathService.${field}: não pode ser vazio.`);
    }
  }

  static _assertDateBR(field, s) {
    // Checagem de formato: DD-MM-AAAA
    if (typeof s !== "string" || !/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      throw new Error(`BathService.${field}: use DD-MM-AAAA.`);
    }
    // Checagem simples de intervalos
    const [dd, mm, yyyy] = s.split("-").map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
      throw new Error(`BathService.${field}: data inválida.`);
    }
  }

  static _assertTimeBR(field, s) {
    // Formato: XXhYYm
    if (typeof s !== "string" || !/^\d{2}h\d{2}m$/.test(s)) {
      throw new Error(`BathService.${field}: use XXhYYm.`);
    }
    // Intervalos: 00..23 e 00..59
    const m = s.match(/^(\d{2})h(\d{2})m$/);
    const hh = Number(m[1]), min = Number(m[2]);
    if (hh < 0 || hh > 23 || min < 0 || min > 59) {
      throw new Error(`BathService.${field}: hora inválida.`);
    }
  }

  static _assertConclusao(field, v) {
    if (v !== "Agendado" && v !== "Concluído") {
      throw new Error(`BathService.${field}: use "Agendado" ou "Concluído".`);
    }
  }

  static _assertPagamento(field, v) {
    if (v !== "Não pago" && v !== "Pago") {
      throw new Error(`BathService.${field}: use "Não pago" ou "Pago".`);
    }
  }
}
