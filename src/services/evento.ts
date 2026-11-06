import type { EventState, PrizeId, SpinRecord } from "../types/evento";
import { escolherFatia } from "../utils/roleta";
import {
  calcularChances,
  criarBrindes,
  criarEvento,
  restantes,
  situacaoDoGiro,
  sortearBrinde,
  tempoDecorrido,
} from "../utils/sorteio";

const CHAVE = "venus-roleta:evento";

export interface ResultadoDoGiro {
  evento: EventState;
  giro: SpinRecord;
}

export interface AjusteDeBrinde {
  total: number;
  multiplier: number;
  active: boolean;
}

export interface ConfiguracaoDoEvento {
  durationSeconds: number;
  expectedSpinSeconds: number;
}

function ehEstadoDoEvento(valor: unknown): valor is EventState {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }

  const candidato = valor as Partial<EventState>;
  return (
    candidato.version === 1 &&
    typeof candidato.durationSeconds === "number" &&
    Array.isArray(candidato.prizes) &&
    Array.isArray(candidato.spins)
  );
}

function ler(): EventState {
  const salvo = localStorage.getItem(CHAVE);

  if (salvo === null) {
    return criarEvento();
  }

  const dados: unknown = JSON.parse(salvo);

  if (!ehEstadoDoEvento(dados)) {
    throw new Error("Formato inválido.");
  }

  return completarBrindes(dados);
}

// Um evento salvo antes de a lista de brindes mudar teria brinde a menos (que
// nunca sairia) ou a mais (que não existe na roleta). A lista padrão manda, e os
// ajustes salvos dos brindes que continuam são mantidos.
function completarBrindes(evento: EventState): EventState {
  const prizes = criarBrindes().map(
    (padrao) => evento.prizes.find((brinde) => brinde.id === padrao.id) ?? padrao,
  );
  return { ...evento, prizes };
}

function gravar(evento: EventState): EventState {
  localStorage.setItem(CHAVE, JSON.stringify(evento));
  return evento;
}

async function alterar(
  mudanca: (evento: EventState) => EventState,
  mensagemDeErro: string,
): Promise<EventState> {
  try {
    return gravar(mudanca(ler()));
  } catch {
    throw new Error(mensagemDeErro);
  }
}

export async function carregarEvento(): Promise<EventState> {
  try {
    return ler();
  } catch {
    throw new Error(
      "Os dados do evento salvos neste navegador estão danificados. Reinicie o evento no painel.",
    );
  }
}

// O resultado é sorteado e gravado antes da animação: assim, recarregar a página
// no meio do giro mostra o mesmo prêmio, sem chance de sortear de novo.
export async function girarRoleta(): Promise<ResultadoDoGiro> {
  try {
    const evento = ler();
    const agora = Date.now();

    if (situacaoDoGiro(evento, agora).kind !== "ready") {
      throw new Error("A roleta não está liberada agora.");
    }

    const forcado = evento.prizes.find(
      (brinde) => brinde.id === evento.forcedPrizeId && restantes(evento, brinde) > 0,
    );
    const prizeId = forcado?.id ?? sortearBrinde(evento, calcularChances(evento, agora));

    if (prizeId === null) {
      throw new Error("Não há brindes disponíveis.");
    }

    const giro: SpinRecord = {
      id: crypto.randomUUID(),
      prizeId,
      ...escolherFatia(prizeId),
      spunAt: agora,
      elapsedSeconds: tempoDecorrido(evento, agora),
      forced: forcado !== undefined,
    };

    const atualizado = gravar({
      ...evento,
      spins: [...evento.spins, giro],
      forcedPrizeId: null,
      releasedManually: false,
    });

    return { evento: atualizado, giro };
  } catch (erro) {
    throw new Error(erro instanceof Error ? erro.message : "Não foi possível girar a roleta.");
  }
}

export function iniciarEvento(): Promise<EventState> {
  return alterar(
    (evento) => ({ ...evento, startedAt: Date.now() }),
    "Não foi possível iniciar o evento.",
  );
}

export function pausarEvento(): Promise<EventState> {
  return alterar(
    (evento) => ({ ...evento, pausedAt: Date.now() }),
    "Não foi possível pausar o evento.",
  );
}

export function retomarEvento(): Promise<EventState> {
  return alterar((evento) => {
    if (evento.pausedAt === null) {
      return evento;
    }

    const pausa = (Date.now() - evento.pausedAt) / 1000;
    return { ...evento, pausedAt: null, pausedSeconds: evento.pausedSeconds + pausa };
  }, "Não foi possível retomar o evento.");
}

export function encerrarEvento(): Promise<EventState> {
  return alterar(
    (evento) => ({ ...evento, endedAt: Date.now() }),
    "Não foi possível encerrar o evento.",
  );
}

export function reabrirEvento(): Promise<EventState> {
  return alterar((evento) => {
    if (evento.endedAt === null) {
      return evento;
    }

    const parado = (Date.now() - evento.endedAt) / 1000;
    return { ...evento, endedAt: null, pausedSeconds: evento.pausedSeconds + parado };
  }, "Não foi possível reabrir o evento.");
}

export function desfazerUltimoGiro(): Promise<EventState> {
  return alterar(
    (evento) => ({ ...evento, spins: evento.spins.slice(0, -1) }),
    "Não foi possível desfazer o último giro.",
  );
}

export function ajustarBrinde(id: PrizeId, ajuste: AjusteDeBrinde): Promise<EventState> {
  return alterar(
    (evento) => ({
      ...evento,
      prizes: evento.prizes.map((brinde) =>
        brinde.id === id ? { ...brinde, ...ajuste } : brinde,
      ),
    }),
    "Não foi possível salvar o ajuste do brinde.",
  );
}

export function forcarProximoGiro(id: PrizeId | null): Promise<EventState> {
  return alterar(
    (evento) => ({ ...evento, forcedPrizeId: id }),
    "Não foi possível forçar o próximo giro.",
  );
}

export function liberarProximoGiro(): Promise<EventState> {
  return alterar(
    (evento) => ({ ...evento, releasedManually: true }),
    "Não foi possível liberar o próximo giro.",
  );
}

export function definirRitmoControlado(ligado: boolean): Promise<EventState> {
  return alterar(
    (evento) => ({ ...evento, pacingEnabled: ligado }),
    "Não foi possível alterar o ritmo controlado.",
  );
}

export function configurarEvento(configuracao: ConfiguracaoDoEvento): Promise<EventState> {
  return alterar(
    (evento) => ({ ...evento, ...configuracao }),
    "Não foi possível salvar a configuração do evento.",
  );
}

// Não lê o estado anterior de propósito: é a saída quando os dados estão danificados.
export async function reiniciarEvento(): Promise<EventState> {
  try {
    return gravar(criarEvento());
  } catch {
    throw new Error("Não foi possível reiniciar o evento.");
  }
}

// O evento "storage" só dispara nas outras janelas, que é exatamente o necessário
// para o painel e a roleta se atualizarem entre si no mesmo computador.
export function assinarEvento(aoMudar: () => void): () => void {
  function aoMudarArmazenamento(evento: StorageEvent) {
    if (evento.key === CHAVE) {
      aoMudar();
    }
  }

  window.addEventListener("storage", aoMudarArmazenamento);
  return () => window.removeEventListener("storage", aoMudarArmazenamento);
}
