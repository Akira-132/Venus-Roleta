import { useEffect, useState } from "react";

const UM_SEGUNDO = 1000;

export function useAgora(): number {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const relogio = window.setInterval(() => setAgora(Date.now()), UM_SEGUNDO);
    return () => window.clearInterval(relogio);
  }, []);

  return agora;
}
