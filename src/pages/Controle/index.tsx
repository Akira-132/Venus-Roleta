import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/Logo.svg";
import Button from "../../components/Button";
import EventSettings from "../../components/EventSettings";
import Modal from "../../components/Modal";
import PrizeAdjustment from "../../components/PrizeAdjustment";
import { useAgora } from "../../hooks/useAgora";
import { useEvento } from "../../hooks/useEvento";
import {
  ajustarBrinde,
  configurarEvento,
  definirRitmoControlado,
  desfazerUltimoGiro,
  encerrarEvento,
  forcarProximoGiro,
  iniciarEvento,
  liberarProximoGiro,
  pausarEvento,
  reabrirEvento,
  reiniciarEvento,
  retomarEvento,
} from "../../services/evento";
import { baixarHistorico } from "../../services/historico";
import type { EventState, PrizeId, SpinAvailability } from "../../types/evento";
import {
  formatarDuracao,
  formatarHorario,
  formatarPercentual,
  formatarPrevisao,
} from "../../utils/formatar";
import {
  calcularChances,
  entregues,
  preverBrinde,
  restantes,
  ritmoEstimado,
  situacaoDoGiro,
  tempoRestante,
  totalRestante,
} from "../../utils/sorteio";
import styles from "./styles.module.css";

const MINUTOS_DO_AVISO_FINAL = 30;
const GIROS_NO_HISTORICO = 12;

type Dialogo =
  | { tipo: "ajuste"; id: PrizeId }
  | { tipo: "configuracao" }
  | { tipo: "encerrar" }
  | { tipo: "reiniciar" }
  | null;

function textoDaSituacao(situacao: SpinAvailability): string {
  switch (situacao.kind) {
    case "not_started":
      return "Ainda não iniciado";
    case "paused":
      return "Em pausa";
    case "ended":
      return "Encerrado";
    case "out_of_stock":
      return "Sem brindes disponíveis";
    case "waiting":
      return `Próximo giro em ${formatarDuracao(situacao.seconds)}`;
    case "ready":
      return "Roleta liberada";
  }
}

function nomeDoBrinde(evento: EventState, id: PrizeId): string {
  return evento.prizes.find((brinde) => brinde.id === id)?.name ?? id;
}

function Controle() {
  const { evento, carregando, erro, executar } = useEvento();
  const agora = useAgora();
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  if (carregando) {
    return (
      <main className={styles.estadoCheio}>
        <p aria-live="polite">Carregando o painel...</p>
      </main>
    );
  }

  if (!evento) {
    return (
      <main className={styles.estadoCheio}>
        <h1>O painel não abriu</h1>
        <p role="alert">{erro}</p>
        <Button variant="danger" onClick={() => void executar(reiniciarEvento)}>
          Reiniciar o evento
        </Button>
      </main>
    );
  }

  const situacao = situacaoDoGiro(evento, agora);
  const chances = calcularChances(evento, agora);
  const segundosRestantes = tempoRestante(evento, agora);
  const iniciado = evento.startedAt !== null;
  const encerrado = evento.endedAt !== null;
  const pausado = evento.pausedAt !== null;
  const raroPendentes = evento.prizes.filter(
    (brinde) => brinde.rare && restantes(evento, brinde) > 0,
  );
  const faseFinal =
    iniciado && !encerrado && segundosRestantes <= MINUTOS_DO_AVISO_FINAL * 60;
  const ultimo = evento.spins[evento.spins.length - 1];
  const recentes = evento.spins.slice(-GIROS_NO_HISTORICO).reverse();
  const brindeEmAjuste =
    dialogo?.tipo === "ajuste"
      ? evento.prizes.find((brinde) => brinde.id === dialogo.id)
      : undefined;
  const ritmoReal = evento.spins.length > 30;

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <img className={styles.logo} src={logo} alt="" />
        <span className={styles.marca}>Venus</span>
        <span className={styles.selo}>Controle da roleta</span>
        <Link className={styles.abrir} to="/" target="_blank">
          Abrir a roleta em outra janela
        </Link>
      </header>

      <main className={styles.conteudo}>
        <h1 className={styles.titulo}>{textoDaSituacao(situacao)}</h1>

        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}

        {faseFinal && segundosRestantes > 0 && raroPendentes.length > 0 && (
          <p className={styles.alerta} role="alert">
            Faltam {formatarDuracao(segundosRestantes)} e ainda não saíram:{" "}
            {raroPendentes.map((brinde) => brinde.name).join(", ")}. Se quiser garantir a entrega,
            use "Forçar no próximo giro".
          </p>
        )}

        {iniciado && !encerrado && segundosRestantes === 0 && (
          <p className={styles.alerta} role="alert">
            O tempo do evento acabou. A roleta continua liberada para quem está na fila; encerre
            quando a fila terminar.
          </p>
        )}

        {evento.forcedPrizeId && (
          <p className={styles.aviso} role="status">
            O próximo giro vai dar {nomeDoBrinde(evento, evento.forcedPrizeId)}.
          </p>
        )}

        <section className={styles.bloco} aria-labelledby="titulo-evento">
          <h2 id="titulo-evento" className={styles.subtitulo}>
            Evento
          </h2>

          <dl className={styles.metricas}>
            <div>
              <dt>Tempo restante</dt>
              <dd>{formatarDuracao(segundosRestantes)}</dd>
            </div>
            <div>
              <dt>Giros feitos</dt>
              <dd>{evento.spins.length}</dd>
            </div>
            <div>
              <dt>Brindes restantes</dt>
              <dd>{totalRestante(evento)}</dd>
            </div>
            <div>
              <dt>{ritmoReal ? "Ritmo real, últimos 30 giros" : "Ritmo previsto"}</dt>
              <dd>{formatarDuracao(ritmoEstimado(evento))} por giro</dd>
            </div>
          </dl>

          <div className={styles.acoes}>
            {!iniciado && (
              <Button variant="primary" onClick={() => void executar(iniciarEvento)}>
                Iniciar evento
              </Button>
            )}
            {iniciado && !encerrado && !pausado && (
              <Button onClick={() => void executar(pausarEvento)}>Pausar</Button>
            )}
            {pausado && !encerrado && (
              <Button variant="primary" onClick={() => void executar(retomarEvento)}>
                Retomar
              </Button>
            )}
            {iniciado && !encerrado && (
              <Button onClick={() => setDialogo({ tipo: "encerrar" })}>Encerrar evento</Button>
            )}
            {encerrado && (
              <Button variant="primary" onClick={() => void executar(reabrirEvento)}>
                Reabrir evento
              </Button>
            )}
            <Button onClick={() => setDialogo({ tipo: "configuracao" })}>Configurar evento</Button>
            <Button onClick={() => setDialogo({ tipo: "reiniciar" })}>Reiniciar tudo</Button>
          </div>

          <div className={styles.ritmo}>
            <label className={styles.opcao} htmlFor="ritmo-controlado">
              <input
                id="ritmo-controlado"
                type="checkbox"
                checked={evento.pacingEnabled}
                onChange={(campo) => {
                  const ligado = campo.target.checked;
                  void executar(() => definirRitmoControlado(ligado));
                }}
              />
              Ritmo controlado
            </label>
            <p className={styles.ajuda}>
              Segura o próximo giro para o estoque durar até o fim. Desligado, a fila anda mais
              rápido, mas os brindes podem acabar antes.
            </p>
            <Button
              disabled={situacao.kind !== "waiting"}
              onClick={() => void executar(liberarProximoGiro)}
            >
              Liberar o próximo giro agora
            </Button>
          </div>
        </section>

        <section className={styles.bloco} aria-labelledby="titulo-brindes">
          <h2 id="titulo-brindes" className={styles.subtitulo}>
            Brindes
          </h2>
          <div className={styles.tabelaRolavel}>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th scope="col">Brinde</th>
                  <th scope="col">Entregues</th>
                  <th scope="col">Restam</th>
                  <th scope="col">Chance agora</th>
                  <th scope="col">Ajuste</th>
                  <th scope="col">Previsão</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {evento.prizes.map((brinde) => {
                  const resta = restantes(evento, brinde);
                  const forcado = evento.forcedPrizeId === brinde.id;

                  return (
                    <tr key={brinde.id}>
                      <th scope="row">{brinde.name}</th>
                      <td>{entregues(evento, brinde.id)}</td>
                      <td>{resta}</td>
                      <td>{formatarPercentual(chances[brinde.id])}</td>
                      <td>
                        {brinde.active
                          ? `${String(brinde.multiplier).replace(".", ",")}×`
                          : "Desligado"}
                      </td>
                      <td>
                        {resta === 0
                          ? "Esgotado"
                          : formatarPrevisao(
                              preverBrinde(evento, brinde, chances[brinde.id], agora),
                            )}
                      </td>
                      <td>
                        <div className={styles.acoesDaLinha}>
                          <Button
                            aria-label={`Ajustar ${brinde.name}`}
                            onClick={() => setDialogo({ tipo: "ajuste", id: brinde.id })}
                          >
                            Ajustar
                          </Button>
                          <Button
                            disabled={resta === 0}
                            aria-label={
                              forcado
                                ? `Cancelar ${brinde.name} no próximo giro`
                                : `Forçar ${brinde.name} no próximo giro`
                            }
                            onClick={() =>
                              void executar(() => forcarProximoGiro(forcado ? null : brinde.id))
                            }
                          >
                            {forcado ? "Cancelar" : "Forçar no próximo giro"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.bloco} aria-labelledby="titulo-historico">
          <h2 id="titulo-historico" className={styles.subtitulo}>
            Últimos giros
          </h2>

          {recentes.length === 0 ? (
            <p className={styles.ajuda}>Os giros aparecem aqui assim que a roleta começar.</p>
          ) : (
            <ol className={styles.historico}>
              {recentes.map((giro) => (
                <li key={giro.id}>
                  <span>{formatarHorario(giro.spunAt)}</span>
                  <span>{nomeDoBrinde(evento, giro.prizeId)}</span>
                  {giro.forced && <span className={styles.forcado}>Forçado</span>}
                </li>
              ))}
            </ol>
          )}

          <div className={styles.acoes}>
            <Button disabled={!ultimo} onClick={() => void executar(desfazerUltimoGiro)}>
              {ultimo
                ? `Desfazer último giro (${nomeDoBrinde(evento, ultimo.prizeId)})`
                : "Desfazer último giro"}
            </Button>
            <Button
              disabled={!ultimo}
              onClick={() =>
                void executar(async () => {
                  await baixarHistorico(evento);
                  return evento;
                })
              }
            >
              Exportar histórico
            </Button>
          </div>
        </section>
      </main>

      <Modal
        isOpen={dialogo?.tipo === "ajuste"}
        title={`Ajustar ${brindeEmAjuste?.name ?? "brinde"}`}
        onClose={() => setDialogo(null)}
      >
        {brindeEmAjuste && (
          <PrizeAdjustment
            key={brindeEmAjuste.id}
            event={evento}
            prize={brindeEmAjuste}
            now={agora}
            onCancel={() => setDialogo(null)}
            onSave={(ajuste) => {
              void executar(() => ajustarBrinde(brindeEmAjuste.id, ajuste));
              setDialogo(null);
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={dialogo?.tipo === "configuracao"}
        title="Configurar evento"
        onClose={() => setDialogo(null)}
      >
        {dialogo?.tipo === "configuracao" && (
          <EventSettings
            event={evento}
            onCancel={() => setDialogo(null)}
            onSave={(configuracao) => {
              void executar(() => configurarEvento(configuracao));
              setDialogo(null);
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={dialogo?.tipo === "encerrar"}
        title="Encerrar o evento?"
        onClose={() => setDialogo(null)}
      >
        <p className={styles.textoDoDialogo}>
          A roleta para de girar. Se foi engano, dá para reabrir depois.
        </p>
        <div className={styles.acoesDoDialogo}>
          <Button autoFocus onClick={() => setDialogo(null)}>
            Continuar o evento
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void executar(encerrarEvento);
              setDialogo(null);
            }}
          >
            Encerrar evento
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={dialogo?.tipo === "reiniciar"}
        title="Reiniciar tudo?"
        onClose={() => setDialogo(null)}
      >
        <p className={styles.textoDoDialogo}>
          Apaga todos os {evento.spins.length} giros, os ajustes e o horário de início. Não dá para
          desfazer. Exporte o histórico antes, se precisar dele.
        </p>
        <div className={styles.acoesDoDialogo}>
          <Button autoFocus onClick={() => setDialogo(null)}>
            Manter os dados
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void executar(reiniciarEvento);
              setDialogo(null);
            }}
          >
            Apagar e reiniciar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default Controle;
