import type { Prize } from "../../types/evento";
import styles from "./styles.module.css";

interface SpinResultProps {
  prize: Prize;
}

// De propósito não há "seguro para você" nem lista de ingredientes como no app:
// aqui saem alimentos, e uma brincadeira dessas poderia confundir quem tem alergia.
function SpinResult({ prize }: SpinResultProps) {
  const especial = prize.id === "veninha";

  return (
    <section
      className={`${styles.card} ${especial ? styles.especial : ""}`}
      aria-labelledby="titulo-resultado"
    >
      <div className={styles.anel} role="img" aria-label="Nota da sorte: 100 de 100">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className={styles.trilha} cx="50" cy="50" r="44" />
          <circle className={styles.progresso} cx="50" cy="50" r="44" />
        </svg>
        <span className={styles.nota}>100</span>
      </div>
      <div>
        <h2 id="titulo-resultado" className={styles.rotulo}>
          Análise do seu giro
        </h2>
        <p className={styles.nome}>{prize.name}</p>
        <p className={styles.instrucao}>Nota 100 em sorte. Retire seu brinde com a equipe.</p>
      </div>
    </section>
  );
}

export default SpinResult;
