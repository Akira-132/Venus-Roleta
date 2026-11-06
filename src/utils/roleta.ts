import type { PrizeId } from "../types/evento";

// O tamanho da fatia é só visual: a chance real vem de calcularChances.
// Comuns repetem para a roleta parecer cheia, e raros aparecem uma vez cada.
export const FATIAS: PrizeId[] = [
  "cookies",
  "botton",
  "brownie",
  "canetas",
  "cookies",
  "espelho",
  "brownie",
  "botton",
  "cookies",
  "canetas",
  "brownie",
  "canecas",
  "cookies",
  "botton",
  "brownie",
  "canetas",
  "veninha",
];

export const ANGULO_DA_FATIA = (Math.PI * 2) / FATIAS.length;

const DESLOCAMENTO_MAXIMO = 0.35;

export function escolherFatia(
  id: PrizeId,
  aleatorio: () => number = Math.random,
): { sliceIndex: number; landingOffset: number } {
  const indices = FATIAS.flatMap((fatia, indice) => (fatia === id ? [indice] : []));
  const sliceIndex = indices[Math.floor(aleatorio() * indices.length)];
  const landingOffset = (aleatorio() * 2 - 1) * DESLOCAMENTO_MAXIMO;
  return { sliceIndex, landingOffset };
}

export function anguloDeRepouso(sliceIndex: number, landingOffset: number): number {
  return (sliceIndex + landingOffset) * ANGULO_DA_FATIA;
}

// A roda gira sempre no sentido horário, ou seja, o ângulo só diminui.
export function calcularAnguloFinal(
  anguloAtual: number,
  sliceIndex: number,
  landingOffset: number,
  voltas: number,
): number {
  const volta = Math.PI * 2;
  const repouso = anguloDeRepouso(sliceIndex, landingOffset);
  const limite = anguloAtual - voltas * volta;
  return repouso + Math.floor((limite - repouso) / volta) * volta;
}

export function fatiaNoPonteiro(angulo: number): number {
  const indice = Math.round(angulo / ANGULO_DA_FATIA) % FATIAS.length;
  return (indice + FATIAS.length) % FATIAS.length;
}
