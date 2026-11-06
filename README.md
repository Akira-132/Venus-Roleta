# Roleta Venus

Roleta 3D de brindes para o estande da Venus, com painel de controle separado.
Roda em um computador só e não precisa de internet nem de servidor no dia.

## Como rodar

Antes do evento, com internet, instale e gere a versão final:

```
npm install
npm run build
```

No dia, sem precisar de internet:

```
npm run preview
```

Depois abra as duas telas no mesmo navegador do mesmo computador, em janelas
normais (janela anônima não compartilha os dados):

- `http://localhost:5180/` é a roleta, para a TV ou o segundo monitor;
- `http://localhost:5180/controle` é o painel da equipe.

No painel, confira a configuração e aperte **Iniciar evento**. O tempo começa a
contar nesse momento.

## Como o sorteio funciona

Imagine um saco com uma ficha por brinde. Cada giro tira uma ficha, sem devolver:

```
chance = fichas restantes do brinde ÷ fichas restantes no saco
```

Isso faz qualquer brinde com estoque poder sair em qualquer momento. Se o
movimento for fraco e faltarem giros para o estoque inteiro, os raros (espelho,
canecas e Veninha) têm prioridade, e quem sobra é brinde comum.

O ritmo controlado usa a mesma ideia no tempo. Ele segura o próximo giro para o
estoque durar até o fim:

```
intervalo mínimo = tempo restante ÷ (brindes restantes + 1)
```

A lógica está em `src/utils/sorteio.ts` e não depende de interface.

## Comandos úteis

| Comando | O que faz |
| --- | --- |
| `npm run dev` | abre em modo de desenvolvimento |
| `npm test` | roda os testes da lógica |
| `npm run simular` | simula centenas de eventos e mostra entregas, sobras e filas |

## Cuidados no dia

- Os dados ficam no navegador. Limpar os dados do site apaga o evento.
- O resultado é salvo antes da animação, então recarregar a página não muda o prêmio.
- Mantenha o computador na tomada, sem suspensão automática.
- Use **Exportar histórico** no painel para guardar os giros.
- A tela da roleta não tem link para o painel, mas o endereço `/controle` funciona
  em qualquer janela. Deixe o teclado e o mouse fora do alcance do público.
