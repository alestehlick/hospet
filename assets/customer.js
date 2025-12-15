// Customer.js — Tutor do cão (Cliente)
//
// Objetivo deste arquivo:
// - Definir a estrutura "Customer" exatamente como você descreveu.
// - Implementar APENAS leis estruturais: regras que garantem que o Customer isolado é bem-formado.
// - Não faz validação relacional (ex.: se dogIds existem de verdade) — isso fica para regras de negócio depois.
//
// Convenções usadas:
// - `id` pode ser null por enquanto, porque você ainda não definiu como os IDs serão gerados.
// - Se `id` existir, deve ser texto não vazio.
// - Créditos devem ser inteiros >= 0.
// - Arrays de ids devem conter apenas strings não vazias.

export class Customer {
  constructor(data = {}) {
    // ---------------------------
    // Campos principais (dados do tutor)
    // ---------------------------

    // id: identificador único do cliente. Pode ser null por enquanto.
    this.id = data.id ?? null;

    // nome: obrigatório
    this.nome = data.nome ?? "";

    // telefoneWhatsApp: opcional neste momento (mas deve ser string)
    // (mais tarde podemos validar formato BR, ex: (11) 91234-5678)
    this.telefoneWhatsApp = data.telefoneWhatsApp ?? "";

    // email: opcional (mas deve ser string)
    this.email = data.email ?? "";

    // endereco: opcional (mas deve ser string)
    this.endereco = data.endereco ?? "";

    // ---------------------------
    // Ligações para outros objetos (aqui apenas IDs)
    // ---------------------------

    // dogIds: lista de IDs de cães que pertencem a este tutor.
    // Se vier algo que não é array, normalizamos para array vazio.
    this.dogIds = Array.isArray(data.dogIds) ? data.dogIds : [];

    // servicoIds: lista de IDs de serviços passados/futuros associados ao tutor.
    // (Pode ser derivável depois, mas você pediu explícito.)
    this.servicoIds = Array.isArray(data.servicoIds) ? data.servicoIds : [];

    // ---------------------------
    // Créditos
    // ---------------------------

    // creditosCreche / Transporte / Banho:
    // Armazenamos como números inteiros não negativos.
    this.creditosCreche = data.creditosCreche ?? 0;
    this.creditosTransporte = data.creditosTransporte ?? 0;
    this.creditosBanho = data.creditosBanho ?? 0;

    // Chamamos validate() aqui para garantir que um Customer recém-criado já nasce válido.
    // Se houver erro, ele aparece imediatamente (bom para detectar bugs cedo).
    this.validate();
  }

  validate() {
    // ---------------------------
    // Regras estruturais para id
    // ---------------------------
    // id pode ser null. Se não for null, deve ser string não vazia.
    if (this.id !== null) Customer._assertNonEmptyString("id", this.id);

    // ---------------------------
    // Regras estruturais para dados do tutor
    // ---------------------------

    // nome é obrigatório: string não vazia
    Customer._assertNonEmptyString("nome", this.nome);

    // outros campos são opcionais, mas se existirem devem ser strings
    Customer._assertString("telefoneWhatsApp", this.telefoneWhatsApp);
    Customer._assertString("email", this.email);
    Customer._assertString("endereco", this.endereco);

    // ---------------------------
    // Regras estruturais para créditos
    // ---------------------------
    // Convertemos para inteiro e garantimos que não é negativo.
    this.creditosCreche = Customer._toIntNonNegative("creditosCreche", this.creditosCreche);
    this.creditosTransporte = Customer._toIntNonNegative("creditosTransporte", this.creditosTransporte);
    this.creditosBanho = Customer._toIntNonNegative("creditosBanho", this.creditosBanho);

    // ---------------------------
    // Regras estruturais para listas de IDs
    // ---------------------------
    // dogIds e servicoIds devem ser arrays só de strings não vazias.
    Customer._assertIdArray("dogIds", this.dogIds);
    Customer._assertIdArray("servicoIds", this.servicoIds);
  }

  toJSON() {
    // Retorna um objeto literal (plain object) pronto para salvar como JSON.
    // Incluímos um campo "tipo" para ajudar a identificar o que é ao carregar.
    return {
      tipo: "Customer",
      id: this.id,
      nome: this.nome,
      telefoneWhatsApp: this.telefoneWhatsApp,
      email: this.email,
      endereco: this.endereco,
      dogIds: this.dogIds,
      creditosCreche: this.creditosCreche,
      creditosTransporte: this.creditosTransporte,
      creditosBanho: this.creditosBanho,
      servicoIds: this.servicoIds,
    };
  }

  static fromJSON(obj) {
    // Reconstrói a classe a partir de um objeto vindo do JSON.
    // Aqui assumimos que obj já tem os campos no formato esperado;
    // validate() vai pegar o que estiver errado.
    return new Customer(obj || {});
  }

  // =========================================================
  // Helpers estruturais (privados por convenção)
  // =========================================================

  static _assertString(field, v) {
    // Exige que o valor seja do tipo string.
    if (typeof v !== "string") {
      throw new Error(`Customer.${field}: deve ser texto.`);
    }
  }

  static _assertNonEmptyString(field, v) {
    // Exige string não vazia (após trim).
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`Customer.${field}: não pode ser vazio.`);
    }
  }

  static _toIntNonNegative(field, v) {
    // Converte para número e exige inteiro >= 0.
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      throw new Error(`Customer.${field}: deve ser inteiro.`);
    }
    if (n < 0) {
      throw new Error(`Customer.${field}: não pode ser negativo.`);
    }
    return n;
  }

  static _assertIdArray(field, arr) {
    // Exige array de strings não vazias.
    if (!Array.isArray(arr)) {
      throw new Error(`Customer.${field}: deve ser lista (array).`);
    }
    for (const x of arr) {
      if (typeof x !== "string" || x.trim() === "") {
        throw new Error(`Customer.${field}: contém id inválido.`);
      }
    }
  }
}
