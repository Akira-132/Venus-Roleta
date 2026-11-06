import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import logo from "../../assets/Logo.svg";
import Button from "../../components/Button";
import Compact3D from "../../components/Compact3D";
import type { SpinTarget } from "../../components/Compact3D";
import SpinResult from "../../components/SpinResult";
import Veninha from "../../components/Veninha";
import type { VeninhaMood } from "../../components/Veninha";
import { useAgora } from "../../hooks/useAgora";
import { useEvento } from "../../hooks/useEvento";
import { girarRoleta } from "../../services/evento";
import type { EventState, Prize, PrizeId, SpinAvailability } from "../../types/evento";
import { restantes, situacaoDoGiro } from "../../utils/sorteio";
import styles from "./styles.module.css";

interface EstadoDoGiro {
  fase: "parada" | "girando";
  alvo: SpinTarget | null;
  exibidoId: string | null;
  esgotadosCongelados: PrizeId[] | null;
  erro: string | null;
}

interface FalaDaVeninha {
  mood: VeninhaMood;
  message: string;
}

const FRASES_DO_RESULTADO: Record<PrizeId, string> = {
  cookies: "Saiu cookie! Agora é só pegar o seu.",
  brownie: "Saiu brownie! Agora é só pegar o seu.",
  sequilhos: "Saiu sequilho! Agora é só pegar o seu.",
  canetas: "Saiu caneta! Boa para anotar o que tem no rótulo.",
  espelho: "Saiu espelho! Esse é dos difíceis.",
  canecas: "Saiu caneca! Só existem 5 na feira inteira.",
  veninha: "Você achou a única Veninha de crochê da feira!",
};

function falaDaSituacao(situacao: SpinAvailability): FalaDaVeninha {
  switch (situacao.kind) {
    case "not_started":
      return { mood: "confusa", message: "A roleta abre daqui a pouco." };
    case "paused":
      return { mood: "confusa", message: "Pausa rapidinha. A roleta já volta." };
    case "ended":
      return { mood: "feliz", message: "A roleta encerrou por hoje. Obrigada pela visita!" };
    case "out_of_stock":
      return { mood: "confusa", message: "Os brindes acabaram. Obrigada pela visita!" };
    case "waiting":
      return { mood: "pensando", message: "Estou preparando o próximo giro." };
    case "ready":
      return { mood: "feliz", message: "Aperte o botão e veja o que sai do estojo!" };
  }
}

function textoDoBotao(situacao: SpinAvailability, girando: boolean): string {
  if (girando) {
    return "Girando...";
  }

  switch (situacao.kind) {
    case "not_started":
      return "A roleta ainda não abriu";
    case "paused":
      return "Roleta em pausa";
    case "ended":
      return "Roleta encerrada";
    case "out_of_stock":
      return "Brindes esgotados";
    case "waiting":
      return `Próximo giro em ${situacao.seconds}s`;
    case "ready":
      return "Girar a roleta";
  }
}

function listarEsgotados(evento: EventState): PrizeId[] {
  return evento.prizes.filter((brinde) => restantes(evento, brinde) === 0).map((brinde) => brinde.id);
}

function Roleta() {
  const { evento, carregando, erro, definirEvento } = useEvento();
  const agora = useAgora();
  const [giro, setGiro] = useState<EstadoDoGiro>({
    fase: "parada",
    alvo: null,
    exibidoId: null,
    esgotadosCongelados: null,
    erro: null,
  });
  // A trava fica num ref porque dois cliques no mesmo instante ainda enxergam o
  // estado antigo, e cada um gastaria um brinde.
  const girando = useRef(false);
  const posicaoInicialFeita = useRef(false);

  useEffect(() => {
    if (!evento || posicaoInicialFeita.current) {
      return;
    }

    posicaoInicialFeita.current = true;
    const ultimo = evento.spins[evento.spins.length - 1];

    if (ultimo) {
      setGiro((atual) => ({
        ...atual,
        exibidoId: ultimo.id,
        alvo: {
          id: ultimo.id,
          sliceIndex: ultimo.sliceIndex,
          landingOffset: ultimo.landingOffset,
          animate: false,
        },
      }));
    }
  }, [evento]);

  const esgotadosAtuais = useMemo(() => (evento ? listarEsgotados(evento) : []), [evento]);
  const ultimoRegistro = evento?.spins[evento.spins.length - 1];
  const premioNaTela = ultimoRegistro?.id === giro.exibidoId ? ultimoRegistro?.prizeId : undefined;
  // Quem acabou de ganhar o último item ainda vê o nome dele na fatia, e não "Esgotado".
  const chaveDosEsgotados = (
    giro.esgotadosCongelados ?? esgotadosAtuais.filter((id) => id !== premioNaTela)
  ).join(",");
  const esgotados = useMemo(
    () => (chaveDosEsgotados === "" ? [] : (chaveDosEsgotados.split(",") as PrizeId[])),
    [chaveDosEsgotados],
  );

  const aoTerminarGiro = useCallback(() => {
    girando.current = false;
    setGiro((atual) => ({
      ...atual,
      fase: "parada",
      exibidoId: atual.alvo?.id ?? atual.exibidoId,
      esgotadosCongelados: null,
    }));
  }, []);

  if (carregando) {
    return (
      <main className={styles.estadoCheio}>
        <p aria-live="polite">Carregando a roleta...</p>
      </main>
    );
  }

  if (!evento) {
    return (
      <main className={styles.estadoCheio}>
        <h1>A roleta não abriu</h1>
        <p role="alert">{erro}</p>
      </main>
    );
  }

  const situacao = situacaoDoGiro(evento, agora);
  const estaGirando = giro.fase === "girando";
  const podeGirar = !estaGirando && situacao.kind === "ready";
  const ultimoGiro = evento.spins[evento.spins.length - 1];
  const giroExibido = !estaGirando && ultimoGiro?.id === giro.exibidoId ? ultimoGiro : null;
  const brindeExibido: Prize | undefined = evento.prizes.find(
    (brinde) => brinde.id === giroExibido?.prizeId,
  );

  async function girar() {
    if (!evento || !podeGirar || girando.current) {
      return;
    }

    girando.current = true;
    setGiro((atual) => ({
      ...atual,
      fase: "girando",
      erro: null,
      // O prato sorteado só pode virar "Esgotado" depois de parar, senão entregaria o resultado.
      esgotadosCongelados: listarEsgotados(evento),
    }));

    try {
      const resultado = await girarRoleta();
      definirEvento(resultado.evento);
      setGiro((atual) => ({
        ...atual,
        alvo: {
          id: resultado.giro.id,
          sliceIndex: resultado.giro.sliceIndex,
          landingOffset: resultado.giro.landingOffset,
          animate: true,
        },
      }));
    } catch (falha) {
      girando.current = false;
      setGiro((atual) => ({
        ...atual,
        fase: "parada",
        esgotadosCongelados: null,
        erro: falha instanceof Error ? falha.message : "Não foi possível girar a roleta.",
      }));
    }
  }

  let fala = falaDaSituacao(situacao);

  if (estaGirando) {
    fala = { mood: "pensando", message: "Hmm, o que será que vai sair?" };
  } else if (brindeExibido && situacao.kind === "waiting") {
    fala = { mood: "feliz", message: FRASES_DO_RESULTADO[brindeExibido.id] };
  }

  const anuncio = estaGirando
    ? "Girando a roleta."
    : brindeExibido
      ? `Resultado: ${brindeExibido.name}. Retire seu brinde com a equipe.`
      : "";

  return (
    <main className={styles.pagina}>
      <span className={styles.marca} aria-hidden="true">
        Venus
      </span>

      <div className={styles.estojo}>
        <Compact3D soldOut={esgotados} target={giro.alvo} onSpinEnd={aoTerminarGiro} />
      </div>

      <div className={styles.lateral}>
        <header className={styles.cabecalho}>
          <img className={styles.logo} src={logo} alt="" />
          <span className={styles.nomeDaMarca}>Venus</span>
        </header>

        <h1 className={styles.titulo}>
          O que vem no seu <span className={styles.destaque}>estojo?</span>
        </h1>

        <Veninha mood={fala.mood} message={fala.message} />

        {brindeExibido && <SpinResult prize={brindeExibido} />}

        {giro.erro && (
          <p className={styles.erro} role="alert">
            {giro.erro}
          </p>
        )}

        <Button
          variant="primary"
          className={styles.girar}
          aria-disabled={!podeGirar}
          autoFocus
          onClick={() => void girar()}
        >
          {textoDoBotao(situacao, estaGirando)}
        </Button>

        <p className="apenas-leitor" aria-live="polite">
          {anuncio}
        </p>
      </div>
    </main>
  );
}

export default Roleta;
