import { describe, expect, it } from "vitest";
import type { EventState, Prize, PrizeId, SpinRecord } from "../types/evento";
import {
  calcularChances,
  criarEvento,
  girosRestantes,
  preverBrinde,
  ritmoEstimado,
  segundosParaLiberar,
  situacaoDoGiro,
  sortearBrinde,
} from "./sorteio";

const INICIO = 1_000_000;

function iniciado(): EventState {
  return { ...criarEvento(), startedAt: INICIO };
}

function aos(segundos: number): number {
  return INICIO + segundos * 1000;
}

function giro(prizeId: PrizeId, elapsedSeconds: number): SpinRecord {
  return {
    id: `${prizeId}-${elapsedSeconds}`,
    prizeId,
    sliceIndex: 0,
    landingOffset: 0,
    spunAt: aos(elapsedSeconds),
    elapsedSeconds,
    forced: false,
  };
}

function comMultiplicador(evento: EventState, id: PrizeId, multiplier: number): Prize[] {
  return evento.prizes.map((b) => (b.id === id ? { ...b, multiplier } : b));
}

function buscar(brindes: Prize[], id: PrizeId): Prize {
  const brinde = brindes.find((b) => b.id === id);
  if (!brinde) {
    throw new Error(`Brinde ${id} ausente`);
  }
  return brinde;
}

describe("calcularChances", () => {
  it("no primeiro giro é proporcional ao estoque e soma 100%", () => {
    const chances = calcularChances(iniciado(), aos(0));
    expect(chances.cookies).toBeCloseTo(200 / 636);
    expect(chances.sequilhos).toBeCloseTo(130 / 636);
    expect(chances.veninha).toBeCloseTo(1 / 636);
    const soma = Object.values(chances).reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(1);
  });

  it("todo brinde com estoque tem chance acima de zero ao longo do dia", () => {
    for (const fracaoQueFalta of [1, 0.5, 0.1, 0.02]) {
      const evento = iniciado();
      evento.prizes = evento.prizes.map((b) => ({
        ...b,
        total: Math.max(1, Math.round(b.total * fracaoQueFalta)),
      }));
      const agora = aos(evento.durationSeconds * (1 - fracaoQueFalta));
      for (const valor of Object.values(calcularChances(evento, agora))) {
        expect(valor).toBeGreaterThan(0);
      }
    }
  });

  it("brinde esgotado ou desligado fica com chance zero", () => {
    const evento = iniciado();
    evento.spins = [giro("veninha", 10)];
    evento.prizes = evento.prizes.map((b) => (b.id === "canecas" ? { ...b, active: false } : b));
    const chances = calcularChances(evento, aos(11));
    expect(chances.veninha).toBe(0);
    expect(chances.canecas).toBe(0);
  });

  it("com pouco movimento, os raros ganham prioridade sobre os comuns", () => {
    const lento = { ...iniciado(), expectedSpinSeconds: 100 };
    const chances = calcularChances(lento, aos(0));
    expect(chances.veninha).toBeCloseTo(1 / 324);
    expect(chances.cookies).toBeLessThan(calcularChances(iniciado(), aos(0)).cookies);
  });

  it("perto do fim, a chance do raro que faltar chega perto de 100%", () => {
    const evento = iniciado();
    const inicial = calcularChances(evento, aos(0)).veninha;
    evento.prizes = evento.prizes.map((b) => ({
      ...b,
      total: b.id === "veninha" ? 1 : b.id === "cookies" ? 3 : 0,
    }));
    const final = calcularChances(evento, aos(32399)).veninha;
    expect(inicial).toBeLessThan(0.01);
    expect(final).toBeGreaterThan(0.99);
  });

  it("o multiplicador muda a chance relativa", () => {
    const evento = iniciado();
    const chances = calcularChances(evento, aos(0), comMultiplicador(evento, "espelho", 2));
    expect(chances.espelho).toBeGreaterThan(calcularChances(evento, aos(0)).espelho * 1.9);
  });
});

describe("sortearBrinde", () => {
  it("respeita as faixas acumuladas", () => {
    const evento = iniciado();
    const chances = calcularChances(evento, aos(0));
    expect(sortearBrinde(evento, chances, () => 0)).toBe("cookies");
    expect(sortearBrinde(evento, chances, () => 0.999999)).toBe("veninha");
  });

  it("devolve nulo quando não há o que sortear", () => {
    const evento = iniciado();
    evento.prizes = evento.prizes.map((b) => ({ ...b, active: false }));
    expect(sortearBrinde(evento, calcularChances(evento, aos(0)))).toBeNull();
  });
});

describe("ritmo", () => {
  it("usa o previsto até ter giros suficientes", () => {
    expect(ritmoEstimado(iniciado())).toBe(50);
  });

  it("limita intervalos enormes para não distorcer a média", () => {
    const evento = iniciado();
    evento.spins = Array.from({ length: 31 }, (_, i) => giro("cookies", i * 10000));
    expect(ritmoEstimado(evento)).toBe(300);
  });

  it("o intervalo começa perto de 51s e diminui se o movimento cair", () => {
    const evento = iniciado();
    evento.spins = [giro("cookies", 0)];
    expect(segundosParaLiberar(evento, aos(0))).toBeCloseTo(32400 / 636);
    const depois = iniciado();
    depois.spins = [giro("cookies", 3600)];
    expect(segundosParaLiberar(depois, aos(3600))).toBeCloseTo(28800 / 636);
  });

  it("não trava com o controle desligado ou liberado à mão", () => {
    const evento = iniciado();
    evento.spins = [giro("cookies", 0)];
    expect(segundosParaLiberar({ ...evento, pacingEnabled: false }, aos(0))).toBe(0);
    expect(segundosParaLiberar({ ...evento, releasedManually: true }, aos(0))).toBe(0);
  });

  it("pausa não consome o tempo do evento", () => {
    const evento = { ...iniciado(), pausedAt: aos(100) };
    expect(girosRestantes(evento, aos(5000))).toBe(girosRestantes(evento, aos(100)));
  });
});

describe("situacaoDoGiro", () => {
  it("cobre os estados do evento", () => {
    expect(situacaoDoGiro(criarEvento(), aos(0)).kind).toBe("not_started");
    expect(situacaoDoGiro(iniciado(), aos(0)).kind).toBe("ready");
    expect(situacaoDoGiro({ ...iniciado(), pausedAt: aos(1) }, aos(2)).kind).toBe("paused");
    expect(situacaoDoGiro({ ...iniciado(), endedAt: aos(1) }, aos(2)).kind).toBe("ended");

    const semEstoque = iniciado();
    semEstoque.prizes = semEstoque.prizes.map((b) => ({ ...b, total: 0 }));
    expect(situacaoDoGiro(semEstoque, aos(2)).kind).toBe("out_of_stock");

    const aguardando = iniciado();
    aguardando.spins = [giro("cookies", 0)];
    expect(situacaoDoGiro(aguardando, aos(1)).kind).toBe("waiting");
  });
});

describe("preverBrinde", () => {
  it("no plano padrão, tudo dura até o fim", () => {
    const evento = iniciado();
    const chances = calcularChances(evento, aos(0));
    for (const brinde of evento.prizes) {
      expect(preverBrinde(evento, brinde, chances[brinde.id], aos(0)).kind).toBe("lasts");
    }
  });

  it("avisa quando o multiplicador faz o brinde acabar antes", () => {
    const evento = iniciado();
    const ajustados = comMultiplicador(evento, "espelho", 3);
    const chances = calcularChances(evento, aos(0), ajustados);
    const previsao = preverBrinde(evento, buscar(ajustados, "espelho"), chances.espelho, aos(0));
    expect(previsao.kind).toBe("runs_out_early");
  });

  it("avisa quando sobra", () => {
    const evento = iniciado();
    const ajustados = comMultiplicador(evento, "cookies", 0.5);
    const chances = calcularChances(evento, aos(0), ajustados);
    const previsao = preverBrinde(evento, buscar(ajustados, "cookies"), chances.cookies, aos(0));
    expect(previsao.kind).toBe("leftover");
  });
});
