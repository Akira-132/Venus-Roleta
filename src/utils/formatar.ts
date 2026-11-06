import type { PrizeForecast } from "../types/evento";

export function formatarDuracao(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = total % 60;

  if (horas > 0) {
    return `${horas}h${String(minutos).padStart(2, "0")}`;
  }

  return minutos > 0 ? `${minutos}min${String(resto).padStart(2, "0")}s` : `${resto}s`;
}

export function formatarPercentual(valor: number): string {
  const percentual = valor * 100;
  const casas = percentual > 0 && percentual < 10 ? 2 : 1;
  return `${percentual.toFixed(casas).replace(".", ",")}%`;
}

export function formatarHorario(instante: number): string {
  return new Date(instante).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatarPrevisao(previsao: PrizeForecast): string {
  if (previsao.kind === "leftover") {
    return `Sobram cerca de ${previsao.amount}`;
  }

  if (previsao.kind === "runs_out_early") {
    return `Acaba cerca de ${formatarDuracao(previsao.minutes * 60)} antes do fim`;
  }

  return "Dura até o fim";
}
