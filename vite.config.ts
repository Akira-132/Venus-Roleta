import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A porta é fixa porque o estado do evento fica no localStorage, que é separado
// por endereço: trocar de porta no meio do dia faria o evento "sumir".
const PORTA = 5180;

export default defineConfig({
  plugins: [react()],
  server: { port: PORTA, strictPort: true },
  preview: { port: PORTA, strictPort: true },
});
