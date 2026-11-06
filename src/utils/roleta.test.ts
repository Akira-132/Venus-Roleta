import { describe, expect, it } from "vitest";
import { FATIAS, calcularAnguloFinal, escolherFatia, fatiaNoPonteiro } from "./roleta";

describe("roleta", () => {
  it("tem todos os brindes, com raros uma vez só", () => {
    expect(FATIAS.filter((f) => f === "veninha")).toHaveLength(1);
    expect(FATIAS.filter((f) => f === "canecas")).toHaveLength(1);
    expect(FATIAS.filter((f) => f === "espelho")).toHaveLength(1);
    expect(new Set(FATIAS).size).toBe(7);
  });

  it("sempre para na fatia sorteada, girando no sentido horário", () => {
    let angulo = 0;
    for (let i = 0; i < 2000; i += 1) {
      const id = FATIAS[i % FATIAS.length];
      const { sliceIndex, landingOffset } = escolherFatia(id);
      const final = calcularAnguloFinal(angulo, sliceIndex, landingOffset, 6);
      expect(FATIAS[fatiaNoPonteiro(final)]).toBe(id);
      expect(final).toBeLessThanOrEqual(angulo - 6 * Math.PI * 2);
      angulo = final;
    }
  });
});
