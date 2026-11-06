import bocaAbertaEstreita from "../../assets/veninha/boca-aberta-estreita.png";
import bocaAbertaLarga from "../../assets/veninha/boca-aberta-larga.png";
import bocaFechada from "../../assets/veninha/boca-fechada.png";
import bocaFechadaFeliz from "../../assets/veninha/boca-fechada-feliz.png";
import bocaTriste from "../../assets/veninha/boca-triste.png";
import caraConfusa from "../../assets/veninha/veninha-confusa.png";
import caraFeliz from "../../assets/veninha/veninha-feliz.png";
import caraPensando from "../../assets/veninha/veninha-pensando.png";
import { useFalaDaVeninha } from "../../hooks/useFalaDaVeninha";
import { useMovimentoReduzido } from "../../hooks/useMovimentoReduzido";
import styles from "./styles.module.css";

export type VeninhaMood = "feliz" | "pensando" | "confusa";

interface VeninhaProps {
  mood: VeninhaMood;
  message: string;
}

interface Rosto {
  cara: string;
  aberta: string;
  fechada: string;
  abertaQuieta: boolean;
  abertaSemMovimento: boolean;
}

// Pares de cara e boca copiados do componente da Veninha no venus-web, para ela
// ter a mesma expressão nos dois lugares.
const ROSTOS: Record<VeninhaMood, Rosto> = {
  feliz: {
    cara: caraFeliz,
    aberta: bocaAbertaEstreita,
    fechada: bocaFechadaFeliz,
    abertaQuieta: false,
    abertaSemMovimento: true,
  },
  confusa: {
    cara: caraConfusa,
    aberta: bocaAbertaLarga,
    fechada: bocaFechada,
    abertaQuieta: true,
    abertaSemMovimento: true,
  },
  pensando: {
    cara: caraPensando,
    aberta: bocaAbertaLarga,
    fechada: bocaTriste,
    abertaQuieta: false,
    abertaSemMovimento: true,
  },
};

function bocaAberta(rosto: Rosto, reduzido: boolean, falando: boolean, aberta: boolean): boolean {
  if (reduzido) {
    return rosto.abertaSemMovimento;
  }

  return falando ? aberta : rosto.abertaQuieta;
}

function Veninha({ mood, message }: VeninhaProps) {
  const reduzido = useMovimentoReduzido();
  const boca = useFalaDaVeninha(message);
  const rosto = ROSTOS[mood];
  const aberta = bocaAberta(rosto, reduzido, boca.falando, boca.aberta);

  return (
    <div className={styles.veninha}>
      <div className={`${styles.rosto} ${styles[mood]}`} aria-hidden="true">
        <img className={styles.cara} src={rosto.cara} alt="" />
        <img
          className={`${styles.boca} ${aberta ? styles.aberta : styles.fechada}`}
          src={aberta ? rosto.aberta : rosto.fechada}
          alt=""
        />
      </div>
      <p className={styles.balao}>
        <span className="apenas-leitor">Veninha: </span>
        {message}
      </p>
    </div>
  );
}

export default Veninha;
