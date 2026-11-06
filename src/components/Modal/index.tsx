import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// O <dialog> nativo já prende o foco, fecha com Esc e devolve o foco ao botão
// que abriu, então não é preciso reescrever nada disso à mão.
function Modal({ isOpen, title, onClose, children }: ModalProps) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idDoTitulo = useId();

  useEffect(() => {
    const elemento = dialogo.current;

    if (!elemento) {
      return;
    }

    if (isOpen && !elemento.open) {
      elemento.showModal();
    }

    if (!isOpen && elemento.open) {
      elemento.close();
    }
  }, [isOpen]);

  return (
    <dialog ref={dialogo} className={styles.modal} aria-labelledby={idDoTitulo} onClose={onClose}>
      <h2 id={idDoTitulo} className={styles.title}>
        {title}
      </h2>
      {children}
    </dialog>
  );
}

export default Modal;
