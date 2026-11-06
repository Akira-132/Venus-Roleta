import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./styles.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
}

function Button({ variant = "secondary", className, children, ...resto }: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(" ");

  return (
    <button type="button" className={classes} {...resto}>
      {children}
    </button>
  );
}

export default Button;
