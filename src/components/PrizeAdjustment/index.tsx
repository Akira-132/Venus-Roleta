import { useId, useState } from "react";
import type { FormEvent } from "react";
import type { AjusteDeBrinde } from "../../services/evento";
import type { EventState, Prize } from "../../types/evento";
import { formatarPercentual, formatarPrevisao } from "../../utils/formatar";
import { calcularChances, entregues, preverBrinde } from "../../utils/sorteio";
import Button from "../Button";
import styles from "./styles.module.css";

const MULTIPLICADORES = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5];

interface PrizeAdjustmentProps {
  event: EventState;
  prize: Prize;
  now: number;
  onSave: (ajuste: AjusteDeBrinde) => void;
  onCancel: () => void;
}

function PrizeAdjustment({ event, prize, now, onSave, onCancel }: PrizeAdjustmentProps) {
  const id = useId();
  const [rascunho, setRascunho] = useState({
    total: String(prize.total),
    multiplier: prize.multiplier,
    active: prize.active,
  });
  const jaEntregues = entregues(event, prize.id);
  const total = Number(rascunho.total);
  const estoqueValido = Number.isInteger(total) && total >= jaEntregues;

  const brindeAjustado: Prize = {
    ...prize,
    total: estoqueValido ? total : prize.total,
    multiplier: rascunho.multiplier,
    active: rascunho.active,
  };
  const brindes = event.prizes.map((brinde) => (brinde.id === prize.id ? brindeAjustado : brinde));
  const chance = calcularChances(event, now, brindes)[prize.id];
  const previsao = preverBrinde({ ...event, prizes: brindes }, brindeAjustado, chance, now);

  function salvar(formulario: FormEvent<HTMLFormElement>) {
    formulario.preventDefault();

    if (estoqueValido) {
      onSave({ total, multiplier: rascunho.multiplier, active: rascunho.active });
    }
  }

  return (
    <form className={styles.formulario} onSubmit={salvar}>
      <div className={styles.campo}>
        <label htmlFor={`${id}-total`}>Quantidade total do brinde</label>
        <input
          id={`${id}-total`}
          type="number"
          min={jaEntregues}
          step={1}
          value={rascunho.total}
          aria-describedby={`${id}-ajuda`}
          aria-invalid={!estoqueValido}
          onChange={(campo) => setRascunho({ ...rascunho, total: campo.target.value })}
        />
        <p id={`${id}-ajuda`} className={styles.ajuda}>
          Já foram entregues {jaEntregues}. Para somar brindes extras, aumente este número.
        </p>
        {!estoqueValido && (
          <p className={styles.erro} role="alert">
            Informe um número inteiro igual ou maior que {jaEntregues}.
          </p>
        )}
      </div>

      <div className={styles.campo}>
        <label htmlFor={`${id}-multiplicador`}>Multiplicador de chance</label>
        <select
          id={`${id}-multiplicador`}
          value={rascunho.multiplier}
          onChange={(campo) => setRascunho({ ...rascunho, multiplier: Number(campo.target.value) })}
        >
          {MULTIPLICADORES.map((valor) => (
            <option key={valor} value={valor}>
              {String(valor).replace(".", ",")}×{valor === 1 ? " (normal)" : ""}
            </option>
          ))}
        </select>
      </div>

      <label className={styles.opcao} htmlFor={`${id}-ativo`}>
        <input
          id={`${id}-ativo`}
          type="checkbox"
          checked={rascunho.active}
          onChange={(campo) => setRascunho({ ...rascunho, active: campo.target.checked })}
        />
        Pode sair na roleta
      </label>

      {!rascunho.active && (
        <p className={styles.alerta} role="alert">
          Enquanto estiver desligado, este brinde não sai para ninguém. Isso quebra a regra de todo
          brinde poder sair durante o evento inteiro.
        </p>
      )}

      <div className={styles.previa} aria-live="polite">
        <p>
          Com este ajuste, a chance no próximo giro fica em{" "}
          <strong>{formatarPercentual(chance)}</strong>.
        </p>
        <p>
          Previsão: <strong>{formatarPrevisao(previsao)}</strong>.
        </p>
      </div>

      <div className={styles.acoes}>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={!estoqueValido}>
          Salvar ajuste
        </Button>
      </div>
    </form>
  );
}

export default PrizeAdjustment;
