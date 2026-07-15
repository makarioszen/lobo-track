# Design do Sistema (System Design) - Portal de Transição da Alcateia

Este documento detalha a arquitetura de software, o fluxo de dados e os componentes do projeto.

## 1. Visão Geral da Arquitetura
O sistema segue o modelo cliente-servidor padrão com uma camada de dados serverless.
- **Frontend (Cliente):** Single Page Application (SPA) em React (construído com Vite). Responsável pela exibição do dashboard, renderização condicional das abas e execução local do widget de inteligência (Akela IA).
- **Backend (API):** Servidor Node.js com Express. Atua como middleware (BFF - Backend For Frontend) responsável por orquestrar a lógica de equivalência (ETL) e persistir os apontamentos.
- **Banco de Dados:** PostgreSQL Serverless provido pelo Neon DB.

## 2. Fluxo de Dados e Integração (ETL em Tempo Real)
Como o sistema lida com a transição entre dois portais externos (Paxtu Legado e Paxtu 100), o backend não duplica dados de negócio inutilmente, mas atua como um agregador.

### 2.1 Leitura (GET `/api/equivalencia/lobinhos`)
1. A API faz um `SELECT` em `associados_legado` (e suas tabelas filhas `progressao_legado`, `especialidades_legado`, `atividades_legado`).
2. A API faz um `SELECT` em `associados_paxtu100` (e tabelas filhas).
3. A API faz um `SELECT` em `ajustes_chefia` (apontamentos manuais).
4. O **Motor de Equivalência** processa em memória:
   - Mapeia códigos antigos para os 18 blocos de aprendizagem novos.
   - Aplica os `ajustes_chefia` que sobrepõem as regras matemáticas.
   - Calcula a idade exata e gera o `% Caminho da Tropa`.
5. Retorna um JSON consolidado para o Frontend (React).

### 2.2 Escrita (POST `/api/apontamentos`)
Quando a chefia interage com o "Modal de Apontamento":
1. O Frontend envia um payload com `id_associado`, `bloco_id`, `acao_tipo` e o status aprovado.
2. A API valida o input e faz um `INSERT/UPDATE` puramente na tabela `ajustes_chefia`.
3. Os dados brutos das extrações (`paxtu100` e `legado`) permanecem intactos (Princípio da Imutabilidade da Origem).

## 3. Estrutura do Frontend (Árvore de Componentes)
```text
src/
 ├── App.jsx (Ponto de entrada, gerencia estado das Abas e dados globais)
 ├── components/
 │    ├── DashboardStats.jsx (KPIs superiores)
 │    ├── PainelEquivalencia.jsx (Tabela principal com progresso visual)
 │    ├── CruzeiroDoSul.jsx (Visualização estilo checklist dos 4 requisitos)
 │    ├── CaminhoTropa.jsx (Timeline calculada via idade)
 │    ├── ApontamentoModal.jsx (Formulário modal acionado na tabela)
 │    └── AkelaAgent.jsx (Widget flutuante monitorando o estado global)
 ├── hooks/
 │    └── useLobinhosData.js (SWR ou React Query para fetch/cache)
 └── utils/
      └── formatters.js (Conversão de datas e cores)
```

## 4. O Agente Akela IA
O `AkelaAgent.jsx` não é um LLM complexo chamando APIs de IA, mas sim um "Sistema Especialista" (Agente Simbólico/Baseado em Regras).
- Ele assina (subscribes) aos dados consolidados de lobinhos.
- Possui regras determinísticas embutidas no seu hook (`useEffect`).
- Se detectar (Lobinhos com `regressao === true`), ele injeta a mensagem no chat orientando a ação.
