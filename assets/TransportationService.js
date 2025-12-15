// TransportationService.js — Serviço: Transporte
//
// Estrutura (como você definiu):
// - ligado a 1 Dog (dogId)
// - tipo: "Para o hotel" / "De volta para casa" (ou, se você quiser literal do seu texto: "ToHotel" / "BackHome")
// - data (DD-MM-AAAA)  [sem hora, conforme sua descrição]
// - status de conclusão: "Agendado" | "Concluído"
// - status de pagamento: "Não pago" | "Pago"
//
// Leis estruturais aqui:
// - dogId obrigatório (string não vazia)
// - tipo obrigatório e limitado aos dois valores permitidos
// - data obrigatória e no formato DD-MM-AAAA
// - statusConclusao e statusPagamento só podem assumir valores permitidos

export class TransportationService {
  constructor(data = {}) {
    // id pode ser null por enquanto (você ainda não definiu geração de id)
    this.id = data.id ?? null;

    // ligação com o cão
    this.dogId = data.dogId ?? null;

    // tipo do transporte:
    // você escreveu "ToHotel/BackHome". Como o site deve ser 100% PT-BR,
    // eu padronizo como:
    // - "Para o hotel"
    // - "De volta para casa"
    //
    // Se você preferir manter "ToHotel" e "BackHome" internamente,
    // é só trocar os valores permitidos no helper _assertTipo().
    this.tipo = data.tipo ?? "";

    // data do transporte (DD-MM-AAAA)
    this.data = data.data ?? "";

    // status (com valores padrão)
    this.statusConclusao = data.statusConclusao ?? "Agendado";
    this.statusPagamento = data.statusPagamento ?? "Não pago";

    // valida imediatamente
    this.validate();
  }

  validate() {
    // id: se existir, deve ser string não vazia
    if (this.id !== null) TransportationService._assertNonEmptyString("id", this.id);

    // dogId obrigatório
    TransportationService._assertNonEmptyString("dogId", this.dogId);

    // tipo obrigatório e dentro do conjunto permitido
    TransportationService._assertTipo("tipo", this.tipo);

    // data obrigatória e válida
    TransportationService._assertDateBR("data", this.data);

    // status dentro do domínio permitido
    TransportationService._assertConclusao("statusConclusao", this.statusConclusao);
    TransportationService._assertPagamento("statusPagamento", this.statusPagamento);
  }

  toJSON() {
    return {
      tipo: "TransportationService",
      id: this.id,
      dogId: this.dogId,
      tipoTransporte: this.tipo, // nome explícito no JSON para evitar confusão com "tipo" de objeto
      data: this.data,
      statusConclusao: this.statusConclusao,
      statusPagamento: this.statusPagamento,
    };
  }

  static fromJSON(obj) {
    // Observação: se o JSON veio com "tipoTransporte", aceitamos também.
    // Isso ajuda compatibilidade caso você salve com esse nome.
    const normalized = { ...(obj || {}) };
    if (normalized.tipo == null && typeof normalized.tipoTransporte === "string") {
      normalized.tipo = normalized.tipoTransporte;
    }
    return new TransportationService(normalized);
  }

  // ------------------ helpers estruturais ------------------

  static _assertNonEmptyString(field, v) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`TransportationService.${field}: não pode ser vazio.`);
    }
  }

  static _assertTipo(field, v) {
    if (typeof v !== "string") {
      throw new Error(`TransportationService.${field}: deve ser texto.`);
    }
    const vv = v.trim();

    // Valores permitidos (PT-BR)
    const allowed = new Set(["Para o hotel", "De volta para casa"]);

    if (!allowed.has(vv)) {
      throw new Error(
        `TransportationService.${field}: valor inválido. Use "Para o hotel" ou "De volta para casa".`
      );
    }
  }

  static _assertDateBR(field, s) {
    // Checagem de formato: DD-MM-AAAA
    if (typeof s !== "string" || !/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      throw new Error(`TransportationService.${field}: use DD-MM-AAAA.`);
    }
    // Checagem simples de intervalos
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
