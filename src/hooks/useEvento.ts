import { useCallback, useEffect, useState } from "react";
import { assinarEvento, carregarEvento } from "../services/evento";
import type { EventState } from "../types/evento";

interface EstadoDoCarregamento {
  evento: EventState | null;
  carregando: boolean;
  erro: string | null;
}

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Algo deu errado. Tente de novo.";
}

export function useEvento() {
  const [estado, setEstado] = useState<EstadoDoCarregamento>({
    evento: null,
    carregando: true,
    erro: null,
  });

  const recarregar = useCallback(async () => {
    try {
      const evento = await carregarEvento();
      setEstado({ evento, carregando: false, erro: null });
    } catch (erro) {
      setEstado({ evento: null, carregando: false, erro: mensagemDe(erro) });
    }
  }, []);

  useEffect(() => {
    void recarregar();
    return assinarEvento(() => void recarregar());
  }, [recarregar]);

  const definirEvento = useCallback((evento: EventState) => {
    setEstado({ evento, carregando: false, erro: null });
  }, []);

  const executar = useCallback(async (acao: () => Promise<EventState>) => {
    try {
      const evento = await acao();
      setEstado({ evento, carregando: false, erro: null });
    } catch (erro) {
      setEstado((anterior) => ({ ...anterior, erro: mensagemDe(erro) }));
    }
  }, []);

  return { ...estado, definirEvento, executar };
}
