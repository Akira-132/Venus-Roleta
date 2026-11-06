import { useEffect, useRef, useState } from "react";

const INTERVALO = 60;
const DURACAO_MAXIMA = 3000;
const LETRAS_POR_SILABA = 3;
const PASSOS_MAXIMOS = Math.floor(DURACAO_MAXIMA / INTERVALO / 2) * 2;

interface Fala {
  passo: number;
  total: number;
}

export interface BocaDaVeninha {
  falando: boolean;
  aberta: boolean;
}

const CALADA: Fala = { passo: 0, total: 0 };

// Mesma conta do app: cada sílaba fechada e aberta, uma a cada três letras,
// com teto de 3s para frases longas não parecerem um disco arranhado.
function falaDe(texto: string): Fala {
  const letras = texto.replace(/[^\p{L}]/gu, "").length;
  const silabas = Math.ceil(letras / LETRAS_POR_SILABA);

  return { passo: 0, total: Math.min(silabas * 2, PASSOS_MAXIMOS) };
}

export function useFalaDaVeninha(texto: string): BocaDaVeninha {
  // Começa com o texto inicial para ela não falar sozinha ao abrir a página.
  const vistoRef = useRef(texto);
  const [fala, setFala] = useState<Fala>(CALADA);

  useEffect(() => {
    if (texto === vistoRef.current) {
      return;
    }

    vistoRef.current = texto;
    setFala(falaDe(texto));
  }, [texto]);

  useEffect(() => {
    if (fala.passo >= fala.total) {
      return;
    }

    const espera = window.setTimeout(() => {
      setFala((atual) => ({ ...atual, passo: atual.passo + 1 }));
    }, INTERVALO);

    return () => {
      window.clearTimeout(espera);
    };
  }, [fala.passo, fala.total]);

  const falando = fala.passo < fala.total;

  return { falando, aberta: falando && fala.passo % 2 === 0 };
}
