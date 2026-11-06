import type { EventState, PrizeId } from "../src/types/evento";
import {
  calcularChances,
  criarEvento,
  restantes,
  segundosParaLiberar,
  sortearBrinde,
  totalRestante,
} from "../src/utils/sorteio";
import { escolherFatia } from "../src/utils/roleta";

const EVENTOS_POR_CENARIO = 500;
const INICIO = 0;

interface Cenario {
  nome: string;
  intervaloDeChegada: (segundos: number) => number;
  cookiesExtras?: number;
}

const CENARIOS: Cenario[] = [
  { nome: "1 pessoa a cada 50s", intervaloDeChegada: () => 50 },
  { nome: "1 pessoa a cada 50s, com 42 brindes extras", intervaloDeChegada: () => 50, cookiesExtras: 42 },
  { nome: "1 pessoa a cada 55s", intervaloDeChegada: () => 55 },
  { nome: "1 pessoa a cada 40s", intervaloDeChegada: () => 40 },
  { nome: "1 pessoa a cada 60s", intervaloDeChegada: () => 60 },
  { nome: "1 pessoa a cada 100s", intervaloDeChegada: () => 100 },
  {
    nome: "picos e vales (30s de manhã, 90s no almoço, 40s à tarde)",
    intervaloDeChegada: (s) => (s < 10800 ? 30 : s < 18000 ? 90 : 40),
  },
];

// Chegadas variam em torno da média: sem isso, a fila simulada seria certinha
// demais e o teste passaria sem provar nada.
function proximaChegada(media: number): number {
  return -Math.log(1 - Math.random()) * media;
}

function simularEvento(cenario: Cenario) {
  const evento: EventState = { ...criarEvento(), startedAt: INICIO };
  evento.prizes = evento.prizes.map((brinde) =>
    brinde.id === "cookies"
      ? { ...brinde, total: brinde.total + (cenario.cookiesExtras ?? 0) }
      : brinde,
  );
  let chegada = 0;
  const chegadas: number[] = [];

  while (chegada < evento.durationSeconds) {
    chegada += proximaChegada(cenario.intervaloDeChegada(chegada));
    if (chegada < evento.durationSeconds) {
      chegadas.push(chegada);
    }
  }

  let relogio = 0;
  let maiorEspera = 0;
  let somaDeEsperas = 0;
  let atendidos = 0;
  const horaDaVeninha: number[] = [];

  for (const hora of chegadas) {
    const ultimoGiro = evento.spins[evento.spins.length - 1];
    const trava = ultimoGiro ? segundosParaLiberar(evento, ultimoGiro.elapsedSeconds * 1000) : 0;
    const liberado = ultimoGiro ? ultimoGiro.elapsedSeconds + trava : 0;
    relogio = Math.max(hora, liberado);

    if (relogio >= evento.durationSeconds || totalRestante(evento) === 0) {
      break;
    }

    const agora = relogio * 1000;
    const chances = calcularChances(evento, agora);
    const id: PrizeId | null = sortearBrinde(evento, chances);

    if (id === null) {
      break;
    }

    const espera = relogio - hora;
    maiorEspera = Math.max(maiorEspera, espera);
    somaDeEsperas += espera;
    atendidos += 1;

    const { sliceIndex, landingOffset } = escolherFatia(id);
    evento.spins.push({
      id: String(evento.spins.length),
      prizeId: id,
      sliceIndex,
      landingOffset,
      spunAt: agora,
      elapsedSeconds: relogio,
      forced: false,
    });

    if (id === "veninha") {
      horaDaVeninha.push(relogio / 3600);
    }
  }

  const ultimo = evento.spins[evento.spins.length - 1];

  return {
    pessoas: chegadas.length,
    atendidos,
    semGiro: chegadas.length - atendidos,
    sobras: evento.prizes.map((brinde) => ({ id: brinde.id, resta: restantes(evento, brinde) })),
    fimDoEstoque: totalRestante(evento) === 0 ? ultimo.elapsedSeconds / 3600 : null,
    ultimoGiro: ultimo ? ultimo.elapsedSeconds / 3600 : 0,
    horaDaVeninha: horaDaVeninha[0] ?? null,
    maiorEspera,
    esperaMedia: atendidos > 0 ? somaDeEsperas / atendidos : 0,
  };
}

function media(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

function formatar(valor: number, casas = 1): string {
  return valor.toFixed(casas).replace(".", ",");
}

for (const cenario of CENARIOS) {
  const resultados = Array.from({ length: EVENTOS_POR_CENARIO }, () => simularEvento(cenario));
  const horasVeninha = resultados.flatMap((r) => (r.horaDaVeninha === null ? [] : [r.horaDaVeninha]));
  const porHora = Array.from({ length: 9 }, (_, hora) =>
    horasVeninha.filter((h) => Math.floor(h) === hora).length,
  );

  console.log(`\n${cenario.nome} (${EVENTOS_POR_CENARIO} eventos)`);
  console.log(`  pessoas: ${formatar(media(resultados.map((r) => r.pessoas)), 0)}`);
  console.log(`  giraram: ${formatar(media(resultados.map((r) => r.atendidos)), 0)}`);
  console.log(`  sem girar ao fim: ${formatar(media(resultados.map((r) => r.semGiro)), 0)}`);
  console.log(`  espera média: ${formatar(media(resultados.map((r) => r.esperaMedia)) / 60)} min`);
  console.log(`  maior espera (média dos eventos): ${formatar(media(resultados.map((r) => r.maiorEspera)) / 60)} min`);
  console.log(`  último giro: ${formatar(media(resultados.map((r) => r.ultimoGiro)), 2)} h`);

  const nomes: PrizeId[] = ["cookies", "brownie", "botton", "canetas", "espelho", "canecas", "veninha"];
  const sobras = nomes.map((id) => {
    const valor = media(resultados.map((r) => r.sobras.find((s) => s.id === id)?.resta ?? 0));
    return `${id} ${formatar(valor)}`;
  });
  console.log(`  sobra média: ${sobras.join(", ")}`);

  const raroCompleto = resultados.filter((r) =>
    r.sobras.every((s) => !["espelho", "canecas", "veninha"].includes(s.id) || s.resta === 0),
  ).length;
  console.log(`  eventos com todos os raros entregues: ${formatar((raroCompleto / EVENTOS_POR_CENARIO) * 100)}%`);
  console.log(`  Veninha por hora do evento (%): ${porHora.map((n) => formatar((n / EVENTOS_POR_CENARIO) * 100, 0)).join(" ")}`);
}
