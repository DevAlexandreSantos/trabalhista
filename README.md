# Calculadora Trabalhista

Calculadora web de **horas extras**, **férias** e **rescisão**, feita em HTML, CSS e JavaScript puro (sem frameworks e sem etapa de build). Usa as tabelas de **INSS** e **Imposto de Renda de 2026**, incluindo a nova redução do IR da Lei 15.270/2025 (isenção para rendimentos de até R$ 5.000).

O resultado aparece no formato de um holerite, com proventos, descontos e o valor líquido, além de uma seção "Como calculamos" que explica cada conta.

> ⚠️ Os resultados são **estimativas para conferência**. A folha real pode variar por convenção coletiva, médias de variáveis, faltas, pensão alimentícia e outros descontos. Para valores oficiais, confirme com o RH, o contador ou o sindicato da categoria.

## Funcionalidades

### Horas extras
- Jornada semanal configurável (44, 40, 36, 30, 25 ou 20 horas).
- Horas extras em dias úteis e em domingos/feriados, cada uma com seu adicional (padrão 50% e 100%).
- DSR (descanso semanal remunerado) sobre as horas extras calculado automaticamente.
- INSS e IRRF sobre salário + horas extras + DSR, com dependentes.
- FGTS do mês (8%) exibido como informação.

### Férias
- Terço constitucional.
- Média de horas extras e comissões somada à base de cálculo.
- Redução dos dias de direito conforme as faltas injustificadas (30, 24, 18 ou 12 dias; acima de 32 faltas o direito é perdido).
- Opção de vender 1/3 das férias (abono pecuniário), sem INSS e IR sobre o abono.

### Rescisão
- Quatro tipos: demissão sem justa causa, pedido de demissão, acordo entre as partes (art. 484-A da CLT) e justa causa.
- Saldo de salário, aviso prévio (indenizado ou trabalhado; 30 dias + 3 por ano completo, limite de 90), 13º proporcional, férias vencidas e proporcionais com 1/3.
- Aviso indenizado somado ao tempo de serviço (projeção do fim do contrato).
- Multa do FGTS (40% ou 20%) e estimativa do saque liberado. É possível informar o saldo real do FGTS para melhorar a estimativa.
- Alertas contextuais, como prazo de pagamento e seguro-desemprego.

### Interface
- Layout responsivo, com abas acessíveis (`role="tablist"`, navegação por setas do teclado).
- Cálculo em tempo real a cada alteração nos campos.
- Tema claro e escuro automático (`prefers-color-scheme`).
- Respeita `prefers-reduced-motion` e as áreas seguras (safe area) de celulares.

## Como usar

Não há dependências para instalar. Basta abrir o arquivo no navegador:

1. Clone ou baixe o repositório.
2. Abra o `index.html` em qualquer navegador moderno.

Se preferir um servidor local:

```bash
# com Python
python3 -m http.server 8000

# ou com Node
npx serve .
```

Depois acesse `http://localhost:8000`.

> As fontes (Bricolage Grotesque e Public Sans) são carregadas do Google Fonts. Sem internet, o site usa as fontes de reserva do sistema e continua funcionando normalmente.

## Estrutura do projeto

```
.
├── index.html   # estrutura da página, formulários e tabelas de referência
├── styles.css   # estilos, temas claro/escuro e layout responsivo
└── script.js    # regras de cálculo, renderização do holerite e controle das abas
```

O `script.js` é dividido em três partes:

- **Núcleo de cálculo** (entre `CORE-START` e `CORE-END`): funções puras `inss`, `irrf`, `avos`, `fullYears` e utilitários de data, sem acesso ao DOM.
- **Calculadoras** (`calcHE`, `calcFerias`, `calcRescisao`): cada uma lê os campos e devolve um objeto com linhas do holerite, informações extras, alertas e notas.
- **Renderização e abas** (`render`, `setTab`, `recalc`): monta a tabela de proventos e descontos e troca entre os três cálculos.

## Tabelas de 2026 usadas

### INSS do empregado (progressivo, teto de R$ 8.475,55)

| Salário de contribuição | Alíquota |
|---|---|
| Até R$ 1.621,00 | 7,5% |
| De R$ 1.621,01 até R$ 2.902,84 | 9% |
| De R$ 2.902,85 até R$ 4.354,27 | 12% |
| De R$ 4.354,28 até R$ 8.475,55 | 14% |

### Imposto de Renda na fonte

Base de cálculo = rendimento − INSS − dependentes (R$ 189,59 cada). O desconto simplificado de R$ 607,20 é usado quando for mais vantajoso.

| Base de cálculo | Alíquota | Parcela a deduzir |
|---|---|---|
| Até R$ 2.428,80 | isento | — |
| De R$ 2.428,81 até R$ 2.826,65 | 7,5% | R$ 182,16 |
| De R$ 2.826,66 até R$ 3.751,05 | 15% | R$ 394,16 |
| De R$ 3.751,06 até R$ 4.664,68 | 22,5% | R$ 675,49 |
| Acima de R$ 4.664,68 | 27,5% | R$ 908,73 |

### Redução do IR (Lei 15.270/2025)

Aplicada sobre o imposto da tabela:

- Rendimento até R$ 5.000,00: redução de até R$ 312,89 (imposto zerado).
- De R$ 5.000,01 a R$ 7.350,00: redução de R$ 978,62 − (0,133145 × rendimento).
- Acima de R$ 7.350,00: sem redução.

## Atualizando as tabelas

Os valores ficam no topo do `script.js` (`INSS_FAIXAS`, `IR_FAIXAS`, `DEP`, `SIMPL` e os limites da redução dentro de `irrf`). Quando houver mudança na legislação, atualize também a seção "Tabelas usadas nos cálculos" no `index.html` para manter a página consistente com o código.

## Limitações conhecidas

- O IR das férias considera apenas o valor das férias isoladamente; na folha real, a redução de 2026 leva em conta todos os rendimentos do mês.
- Férias vencidas em dobro (período concessivo ultrapassado) não são calculadas.
- Não há suporte a pensão alimentícia, adicionais (insalubridade, periculosidade, noturno), faltas no mês ou descontos personalizados.
- O saldo do FGTS é estimado em 8% do salário por mês trabalhado quando não informado.
- O cálculo é individual e não substitui a conferência com o RH, o contador ou o sindicato.

## Tecnologias

- HTML5 semântico
- CSS3 (variáveis, grid, flexbox, temas claro/escuro)
- JavaScript (ES6+) sem bibliotecas

## Autor

Desenvolvido por [Alexandre Santos](https://github.com/DevAlexandreSantos).

## Licença

Defina a licença do projeto (por exemplo, MIT) e adicione o arquivo `LICENSE` se for publicá-lo.
