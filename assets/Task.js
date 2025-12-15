// Task.js — Tarefa interna
//
// Estrutura:
// - titulo (obrigatório)
// - data (DD-MM-AAAA)
// - statusConclusao: "Agendado" | "Concluído"
// - descricao (opcional)
//
// Leis estruturais:
// - titulo obrigatório
// - data obrigatória e válida
// - statusConclusao dentro do conjunto permitido

export class Task {
  constructor(data = {}) {
    this.id = data.id ?? null;

    this.titulo = data.titulo ?? "";
    this.data = data.data ?? ""; // "DD-MM-AAAA"

    this.statusConclusao = data.statusConclusao ?? "Agendado";
    this.descricao = data.descricao ?? "";

    this.validate();
  }

  validate() {
    if (this.id !== null) Task._assertNonEmptyString("id", this.id);

    Task._assertNonEmptyString("titulo", this.titulo);
    Task._assertDateBR("data", this.data);

    Task._assertConclusao("statusConclusao", this.statusConclusao);

    // descricao é opcional, mas se existir precisa ser string
    if (typeof this.descricao !== "string") {
      throw new Error(`Task.descricao: deve ser texto.`);
    }
  }

  toJSON() {
    return {
      tipo: "Task",
      id: this.id,
      titulo: this.titulo,
      data: this.data,
      statusConclusao: this.statusConclusao,
      descricao: this.descricao,
    };
  }

  static fromJSON(obj) {
    return new Task(obj || {});
  }

  // Helpers

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`Task.${field}: não pode ser vazio.`);
    }
  }

  static _assertDateBR(field, s) {
    if (typeof s !== "string" || !/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      throw new Error(`Task.${field}: use DD-MM-AAAA.`);
    }
    const [dd, mm, yyyy] = s.split("-").map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
      throw new Error(`Task.${field}: data inválida.`);
    }
  }

  static _assertConclusao(field, v) {
    if (v !== "Agendado" && v !== "Concluído") {
      throw new Error(`Task.${field}: use "Agendado" ou "Concluído".`);
    }
  }
}
