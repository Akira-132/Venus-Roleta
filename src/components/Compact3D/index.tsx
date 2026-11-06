import { useEffect, useRef, useState } from "react";
import type { PrizeId } from "../../types/evento";
import { CenaDoEstojo } from "./cena";
import styles from "./styles.module.css";

const DURACAO_DO_GIRO_MS = 7000;
const DURACAO_SEM_MOVIMENTO_MS = 400;

export interface SpinTarget {
  id: string;
  sliceIndex: number;
  landingOffset: number;
  animate: boolean;
}

interface Compact3DProps {
  soldOut: PrizeId[];
  target: SpinTarget | null;
  onSpinEnd: () => void;
}

function Compact3D({ soldOut, target, onSpinEnd }: Compact3DProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cena = useRef<CenaDoEstojo | null>(null);
  const aoTerminar = useRef(onSpinEnd);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");

  useEffect(() => {
    aoTerminar.current = onSpinEnd;
  }, [onSpinEnd]);

  useEffect(() => {
    const elemento = canvas.current;

    if (!elemento) {
      return;
    }

    let ativa = true;
    let criada: CenaDoEstojo;

    try {
      criada = new CenaDoEstojo(elemento);
    } catch {
      setEstado("erro");
      return;
    }

    cena.current = criada;

    const observador = new ResizeObserver(([entrada]) => {
      criada.redimensionar(entrada.contentRect.width, entrada.contentRect.height);
    });
    observador.observe(elemento);

    // A textura é um desenho em canvas: se a fonte ainda não estiver carregada
    // quando ele acontece, o nome das fatias sai numa fonte genérica.
    document.fonts
      .load("600 84px Poppins")
      .catch(() => [])
      .then(() => {
        if (ativa) {
          criada.redesenharFatias();
          setEstado("pronto");
        }
      });

    return () => {
      ativa = false;
      observador.disconnect();
      criada.descartar();
      cena.current = null;
    };
  }, []);

  useEffect(() => {
    cena.current?.redesenharFatias(soldOut);
  }, [soldOut]);

  useEffect(() => {
    if (!target) {
      return;
    }

    const atual = cena.current;

    if (!target.animate) {
      atual?.posicionarEm(target.sliceIndex, target.landingOffset);
      return;
    }

    if (!atual) {
      aoTerminar.current();
      return;
    }

    let ativo = true;
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duracao = semMovimento ? DURACAO_SEM_MOVIMENTO_MS : DURACAO_DO_GIRO_MS;

    void atual.girarPara(target.sliceIndex, target.landingOffset, duracao).then(() => {
      if (ativo) {
        aoTerminar.current();
      }
    });

    return () => {
      ativo = false;
    };
  }, [target]);

  return (
    <div className={styles.palco}>
      <canvas
        ref={canvas}
        className={styles.canvas}
        role="img"
        aria-label="Roleta em forma de estojo de maquiagem aberto. Cada fatia é uma sombra com o nome de um brinde, e um batom aponta para o brinde sorteado."
      />
      {estado === "carregando" && (
        <p className={styles.aviso} aria-live="polite">
          Montando o estojo...
        </p>
      )}
      {estado === "erro" && (
        <p className={styles.aviso} role="alert">
          Este computador não conseguiu abrir a roleta em 3D. O sorteio continua funcionando, e o
          resultado aparece ao lado.
        </p>
      )}
    </div>
  );
}

export default Compact3D;
