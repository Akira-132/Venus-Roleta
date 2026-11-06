import { useEffect, useState } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

function preferenciaAtual(): boolean {
  return window.matchMedia(CONSULTA).matches;
}

export function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(preferenciaAtual);

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA);

    function atualizar() {
      setReduzido(consulta.matches);
    }

    consulta.addEventListener("change", atualizar);

    return () => {
      consulta.removeEventListener("change", atualizar);
    };
  }, []);

  return reduzido;
}
