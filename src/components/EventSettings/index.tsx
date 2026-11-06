import { useId, useState } from "react";
import type { FormEvent } from "react";
import type { ConfiguracaoDoEvento } from "../../services/evento";
import type { EventState } from "../../types/evento";
import Button from "../Button";
import styles from "../PrizeAdjustment/styles.module.css";

interface EventSettingsProps {
  event: EventState;
  onSave: (configuracao: ConfiguracaoDoEvento) => void;
  onCancel: () => void;
}

function EventSettings({ event, onSave, onCancel }: EventSettingsProps) {
  const id = useId();
  const [rascunho, setRascunho] = useState({
    horas: String(event.durationSeconds / 3600),
    segundos: String(event.expectedSpinSeconds),
  });
  const horas = Number(rascunho.horas.replace(",", "."));
  const segundos = Number(rascunho.segundos.replace(",", "."));
  const valido = horas > 0 && segundos > 0;

  function salvar(formulario: FormEvent<HTMLFormElement>) {
    formulario.preventDefault();

    if (valido) {
      onSave({ durationSeconds: horas * 3600, expectedSpinSeconds: segundos });
    }
  }

  return (
    <form className={styles.formulario} onSubmit={salvar}>
      <div className={styles.campo}>
        <label htmlFor={`${id}-horas`}>Duração do evento, em horas</label>
        <input
          id={`${id}-horas`}
          inputMode="decimal"
          value={rascunho.horas}
          aria-invalid={!(horas > 0)}
          onChange={(campo) => setRascunho({ ...rascunho, horas: campo.target.value })}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor={`${id}-segundos`}>Segundos previstos entre uma pessoa e outra</label>
        <input
          id={`${id}-segundos`}
          inputMode="decimal"
          value={rascunho.segundos}
          aria-describedby={`${id}-ajuda`}
          aria-invalid={!(segundos > 0)}
          onChange={(campo) => setRascunho({ ...rascunho, segundos: campo.target.value })}
        />
        <p id={`${id}-ajuda`} className={styles.ajuda}>
          3 pessoas a cada 2min30s dão 50 segundos. Depois de 30 giros, o sistema passa a usar o
          ritmo real.
        </p>
      </div>

      {!valido && (
        <p className={styles.erro} role="alert">
          Informe números maiores que zero nos dois campos.
        </p>
      )}

      <div className={styles.acoes}>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={!valido}>
          Salvar configuração
        </Button>
      </div>
    </form>
  );
}

export default EventSettings;
