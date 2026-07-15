# Regras de Desenvolvimento - Portal de Transição da Alcateia

Estas são as diretrizes estritas que o agente de IA (Gemini/Antigravity) deve seguir durante o desenvolvimento e expansão do Portal de Transição da Alcateia.

## 1. Stack Tecnológico e Arquitetura
- **Monorepo:** O projeto está estruturado em duas pastas, `/portal/frontend` e `/portal/backend`.
- **Frontend:**
  - React com Vite (JSX/JS).
  - Tailwind CSS para estilização (utilizar utility classes nativas).
  - Ícones obrigatoriamente através da biblioteca `lucide-react`.
  - Componentes focados, limpos e preferencialmente em Single-File Component para módulos simples, ou divididos por domínio em `src/components`.
- **Backend:**
  - Node.js com Express.
  - Interação com Banco de Dados via `@neondatabase/serverless` (Neon DB).
  - Queries devem ser seguras e preferencialmente usar a sintaxe literal template do Neon (ex: `sql\`SELECT * FROM...\``).
- **Produção:** Arquitetura pensada para rodar atrás de um proxy reverso NGINX.

## 2. Design System e UX/UI
- **Identidade Visual:** Moderno, responsivo, amigável.
- **Paleta de Cores:**
  - Sucesso/Apto: Verde (ex: `text-green-600`, `bg-green-100`).
  - Transição/Geral: Azul Escoteiro (ex: `text-blue-700`, `bg-blue-50`).
  - Atenção/Não Iniciado: Amarelo (ex: `text-yellow-600`, `bg-yellow-100`).
  - Crítico/Atrasado/Regressão: Vermelho (ex: `text-red-600`, `bg-red-50`).
- **Interação:** O portal não deve ter recarregamentos completos de página (usar estado no React).

## 3. Regras de Negócio e Lógica de Domínio
### Equivalência e Progressão (18 Blocos)
- Sempre calcular o número total de blocos validados combinando os dados das tabelas `_legado`, `_paxtu100` e `ajustes_chefia`.
- **Não-Regressão:** Se a conversão gerar um distintivo (Pata-Tenra, Saltador, Rastreador, Caçador) menor que o salvo no legado, o sistema deve acionar o alerta "Plano de Acompanhamento". O distintivo do usuário **não** regride.

### Caminho da Tropa
- O cálculo baseia-se na idade do Lobinho (início aos 9.5 anos, limite crítico aos 10.5 anos).
- A nota de passagem (0 a 100%) é composta por Pontes (40%), Familiarização (30%) e Avaliação de Prontidão (30%).

## 4. O Agente Akela IA (Assistente Front-end)
- **Implementação:** Componente `<AkelaAgent />` que monitora o estado global (Zustand ou Context API).
- **Gatilho (Trigger):** Deve exibir automaticamente um alerta na tela inicial caso existam lobinhos com *Plano de Acompanhamento* (regressão) ou em *Idade Crítica* para a Tropa (>= 10.5 anos).
- **Persona:** O agente assume a identidade do "Akela", sempre se comunicando no tom escoteiro ("Melhor Possível, Escotista!").

## 5. Práticas de Banco de Dados (Apontamentos)
- Toda edição feita pelos escotistas no *Modal de Apontamento* deve ser salva em uma tabela isolada chamada `ajustes_chefia` (ou `ajustes_progressao`).
- **NUNCA** sobrescrever, dropar ou alterar registros nas tabelas de dados brutos extraídos (`_legado` ou `_paxtu100`). A origem do dado deve ser estritamente preservada para fins de auditoria e consistência.
