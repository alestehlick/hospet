// Dog.js — Cão
//
// Objetivo:
// - Estrutura do Dog como você descreveu.
// - Leis estruturais: um Dog sozinho precisa ter nome, customerId válido, etc.
// - Não verificamos se customerId existe no "banco" (isso é relacional, fica para depois).
//
// Convenções:
// - dataNascimento é opcional, mas se preenchida deve seguir DD-MM-AAAA.

export class Dog {
  constructor(data = {}) {
    // id pode ser null por enquanto
    this.id = data.id ?? null;

    // Campos básicos do cão
    this.nome = data.nome ?? "";
    this.raca = data.raca ?? "";

    // dataNascimento no formato "DD-MM-AAAA" (opcional)
    this.dataNascimento = data.dataNascimento ?? "";

    // Ligação com tutor: você definiu como obrigatória
    this.customerId = data.customerId ?? null;

    // Notas (todas opcionais; mas devem ser strings)
    this.notasDieta = data.notasDieta ?? "";
    this.notasTemperamento = data.notasTemperamento ?? "";
    this.notasVacinas = data.notasVacinas ?? "";
    this.notasSaude = data.notasSaude ?? "";
    this.notasAdicionais = data.notasAdicionais ?? "";

    // Histórico de serviços ligados ao cão (lista de ids)
    this.servicoIds = Array.isArray(data.servicoIds) ? data.servicoIds : [];

    // Valida imediatamente
    this.validate();
  }

  validate() {
    // id: se existe, deve ser string não vazia
    if (this.id !== null) Dog._assertNonEmptyString("id", this.id);

    // nome: obrigatório
    Dog._assertNonEmptyString("nome", this.nome);

    // raca: opcional, mas deve ser string
    Dog._assertString("raca", this.raca);

    // customerId: estruturalmente obrigatório (string não vazia)
    Dog._assertNonEmptyString("customerId", this.customerId);

    // dataNascimento: opcional, mas se preenchida deve ser válida no formato
    Dog._assertString("dataNascimento", this.dataNascimento);
    if (this.dataNascimento.trim() !== "") {
      Dog._assertDateBR("dataNascimento", this.dataNascimento);
    }

    // notas: todas devem ser strings
    Dog._assertString("notasDieta", this.notasDieta);
    Dog._assertString("notasTemperamento", this.notasTemperamento);
    Dog._assertString("notasVacinas", this.notasVacinas);
    Dog._assertString("notasSaude", this.notasSaude);
    Dog._assertString("notasAdicionais", this.notasAdicionais);

    // servicoIds: array de strings não vazias
    Dog._assertIdArray("servicoIds", this.servicoIds);
  }

  toJSON() {
    // objeto pronto para salvar em JSON
    return {
      tipo: "Dog",
      id: this.id,
      nome: this.nome,
      raca: this.raca,
      dataNascimento: this.dataNascimento,
      customerId: this.customerId,
      notasDieta: this.notasDieta,
      notasTemperamento: this.notasTemperamento,
      notasVacinas: this.notasVacinas,
      notasSaude: this.notasSaude,
      notasAdicionais: this.notasAdicionais,
      servicoIds: this.servicoIds,
    };
  }

  static fromJSON(obj) {
    return new Dog(obj || {});
  }

  // Helpers
  static _assertString(field, v) {
    if (typeof v !== "string") throw new Error(`Dog.${field}: deve ser texto.`);
  }

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`Dog.${field}: não pode ser vazio.`);
    }
  }

  static _assertIdArray(field, arr) {
    if (!Array.isArray(arr)) throw new Error(`Dog.${field}: deve ser lista (array).`);
    for (const x of arr) {
      if (typeof x !== "string" || x.trim() === "") {
        throw new Error(`Dog.${field}: contém id inválido.`);
      }
    }
  }

  static _assertDateBR(field, s) {
    // valida apenas formato e intervalos grossos (MVP)
    if (!/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      throw new Error(`Dog.${field}: use DD-MM-AAAA.`);
    }
    const [dd, mm, yyyy] = s.split("-").map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
      throw new Error(`Dog.${field}: data inválida.`);
    }
  }
}
