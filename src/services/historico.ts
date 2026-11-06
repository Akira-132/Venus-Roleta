import type { EventState } from "../types/evento";
import { formatarHorario } from "../utils/formatar";

export async function baixarHistorico(evento: EventState): Promise<void> {
  try {
    const linhas = evento.spins.map((giro) => {
      const brinde = evento.prizes.find((item) => item.id === giro.prizeId);
      return `${formatarHorario(giro.spunAt)};${brinde?.name ?? giro.prizeId};${giro.forced ? "sim" : "não"}`;
    });
    const conteudo = ["Horário;Brinde;Forçado", ...linhas].join("\n");
    // O BOM faz o Excel reconhecer os acentos ao abrir o arquivo.
    const arquivo = new Blob([`﻿${conteudo}`], { type: "text/csv;charset=utf-8" });
    const endereco = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = endereco;
    link.download = "historico-roleta-venus.csv";
    link.click();
    URL.revokeObjectURL(endereco);
  } catch {
    throw new Error("Não foi possível exportar o histórico.");
  }
}
