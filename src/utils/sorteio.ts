import type {
  EventState,
  Prize,
  PrizeForecast,
  PrizeId,
  SpinAvailability,
} from "../types/evento";

const GIROS_NA_MEDIA = 30;
// Uma hora sem ninguém na fila não pode contar como "ritmo": sem este teto, um
// único intervalo longo faria o sistema achar que o resto do dia será lento.
const INTERVALO_MAXIMO_NA_MEDIA = 300;
const FOLGA_PARA_AVISAR_MINUTOS = 5;

export type Chances = Record<PrizeId, number>;

export function criarBrindes(): Prize[] {
  return [
    { id: "cookies", name: "Cookies", total: 200, multiplier: 1, active: true, rare: false },
    { id: "brownie", name: "Brownie", total: 180, multiplier: 1, active: true, rare: false },
    { id: "sequilhos", name: "Sequilhos", total: 130, multiplier: 1, active: true, rare: false },
    { id: "canetas", name: "Canetas", total: 100, multiplier: 1, active: true, rare: false },
    { id: "espelho", name: "Espelho", total: 20, multiplier: 1, active: true, rare: true },
    { id: "canecas", name: "Canecas", total: 5, multiplier: 1, active: true, rare: true },
    { id: "veninha", name: "Veninha de crochê", total: 1, multiplier: 1, active: true, rare: true },
  ];
}

export function criarEvento(): EventState {
  return {
    version: 1,
    startedAt: null,
    endedAt: null,
    durationSeconds: 9 * 60 * 60,
    pausedAt: null,
    pausedSeconds: 0,
    expectedSpinSeconds: 50,
    pacingEnabled: true,
    releasedManually: false,
    forcedPrizeId: null,
    prizes: criarBrindes(),
    spins: [],
  };
}

export function entregues(evento: EventState, id: PrizeId): number {
  return evento.spins.filter((giro) => giro.prizeId === id).length;
}

export function restantes(evento: EventState, brinde: Prize): number {
  return Math.max(0, brinde.total - entregues(evento, brinde.id));
}

export function totalRestante(evento: EventState): number {
  return evento.prizes.reduce((soma, brinde) => soma + restantes(evento, brinde), 0);
}

export function tempoDecorrido(evento: EventState, agora: number): number {
  if (evento.startedAt === null) {
    return 0;
  }

  const referencia = evento.pausedAt ?? evento.endedAt ?? agora;
  return Math.max(0, (referencia - evento.startedAt) / 1000 - evento.pausedSeconds);
}

export function tempoRestante(evento: EventState, agora: number): number {
  return Math.max(0, evento.durationSeconds - tempoDecorrido(evento, agora));
}

export function ritmoEstimado(evento: EventState): number {
  if (evento.spins.length <= GIROS_NA_MEDIA) {
    return evento.expectedSpinSeconds;
  }

  const recentes = evento.spins.slice(-(GIROS_NA_MEDIA + 1));
  let soma = 0;

  for (let i = 1; i < recentes.length; i += 1) {
    const intervalo = recentes[i].elapsedSeconds - recentes[i - 1].elapsedSeconds;
    soma += Math.min(intervalo, INTERVALO_MAXIMO_NA_MEDIA);
  }

  return Math.max(1, soma / GIROS_NA_MEDIA);
}

// Se vier mais gente do que brinde, o ritmo controlado segura a fila e cada giro
// entrega um brinde, então nunca há mais giros úteis do que brindes restantes.
export function girosRestantes(evento: EventState, agora: number): number {
  const estimados = Math.floor(tempoRestante(evento, agora) / ritmoEstimado(evento));
  return Math.max(1, Math.min(estimados, totalRestante(evento)));
}

// Equivale a tirar uma ficha de um saco sem devolver. Quando faltam giros para
// todo o estoque, os raros mantêm a chance de sair até o fim e os comuns dividem
// o que sobra: é por isso que, com pouco movimento, quem sobra é brinde comum.
export function calcularChances(
  evento: EventState,
  agora: number,
  brindes: Prize[] = evento.prizes,
): Chances {
  const simulado: EventState = { ...evento, prizes: brindes };
  const giros = girosRestantes(simulado, agora);
  const estoqueComum = brindes
    .filter((brinde) => !brinde.rare)
    .reduce((soma, brinde) => soma + restantes(simulado, brinde), 0);
  const parteDosRaros = brindes
    .filter((brinde) => brinde.rare)
    .reduce((soma, brinde) => soma + restantes(simulado, brinde) / giros, 0);
  const parteDosComuns = Math.max(0, 1 - parteDosRaros);

  const pesos = brindes.map((brinde) => {
    const resta = restantes(simulado, brinde);

    if (!brinde.active || resta === 0) {
      return { id: brinde.id, peso: 0 };
    }

    const base = brinde.rare
      ? resta / giros
      : (resta / estoqueComum) * parteDosComuns;

    return { id: brinde.id, peso: base * brinde.multiplier };
  });

  const soma = pesos.reduce((total, item) => total + item.peso, 0);
  const chances: Chances = {
    cookies: 0,
    brownie: 0,
    sequilhos: 0,
    canetas: 0,
    espelho: 0,
    canecas: 0,
    veninha: 0,
  };

  for (const item of pesos) {
    chances[item.id] = soma > 0 ? item.peso / soma : 0;
  }

  return chances;
}

export function sortearBrinde(
  evento: EventState,
  chances: Chances,
  aleatorio: () => number = Math.random,
): PrizeId | null {
  const candidatos = evento.prizes.filter((brinde) => chances[brinde.id] > 0);

  if (candidatos.length === 0) {
    return null;
  }

  const sorteado = aleatorio();
  let acumulado = 0;

  for (const brinde of candidatos) {
    acumulado += chances[brinde.id];

    if (sorteado < acumulado) {
      return brinde.id;
    }
  }

  return candidatos[candidatos.length - 1].id;
}

// Mesma ideia da chance, aplicada ao tempo: o que falta do evento dividido pelo
// que falta de brinde. Se o movimento cai, o intervalo encolhe sozinho. O "+ 1"
// evita que o último brinde só seja liberado no instante exato do encerramento.
export function segundosParaLiberar(evento: EventState, agora: number): number {
  const ultimo = evento.spins[evento.spins.length - 1];
  const estoque = totalRestante(evento);

  if (!evento.pacingEnabled || evento.releasedManually || !ultimo || estoque === 0) {
    return 0;
  }

  const intervalo = Math.max(0, evento.durationSeconds - ultimo.elapsedSeconds) / (estoque + 1);
  return Math.max(0, ultimo.elapsedSeconds + intervalo - tempoDecorrido(evento, agora));
}

export function situacaoDoGiro(evento: EventState, agora: number): SpinAvailability {
  if (evento.startedAt === null) {
    return { kind: "not_started" };
  }

  if (evento.endedAt !== null) {
    return { kind: "ended" };
  }

  if (evento.pausedAt !== null) {
    return { kind: "paused" };
  }

  const haBrindeLigado = evento.prizes.some(
    (brinde) => brinde.active && restantes(evento, brinde) > 0,
  );

  if (!haBrindeLigado) {
    return { kind: "out_of_stock" };
  }

  const segundos = segundosParaLiberar(evento, agora);
  return segundos > 0 ? { kind: "waiting", seconds: Math.ceil(segundos) } : { kind: "ready" };
}

export function preverBrinde(
  evento: EventState,
  brinde: Prize,
  chance: number,
  agora: number,
): PrizeForecast {
  const resta = restantes(evento, brinde);

  if (resta === 0) {
    return { kind: "lasts" };
  }

  const giros = girosRestantes(evento, agora);
  const esperado = chance * giros;

  if (resta - esperado >= 0.25) {
    return { kind: "leftover", amount: Math.ceil(resta - esperado) };
  }

  const segundos = tempoRestante(evento, agora);
  const acabaEm = chance > 0 ? (resta / chance) * (segundos / giros) : segundos;
  const minutosAntes = Math.round((segundos - acabaEm) / 60);

  return minutosAntes > FOLGA_PARA_AVISAR_MINUTOS
    ? { kind: "runs_out_early", minutes: minutosAntes }
    : { kind: "lasts" };
}
