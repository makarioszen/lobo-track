# Plano de Implementação: Portal de Acompanhamento - Transição da Alcateia

Este portal será uma aplicação React moderna focada na gestão da migração pedagógica da Alcateia, cruzando e exibindo dados extraídos do Paxtu Legado e Paxtu 100, além de permitir ajustes e "apontamentos de chefia" persistidos em banco de dados próprio (Neon DB).

## User Review Required
> [!IMPORTANT]
> Verifique a arquitetura proposta e as tabelas de banco de dados para os apontamentos da chefia. Se estiver de acordo, iniciaremos a criação do projeto React e dos componentes.

## Open Questions
- **Autenticação Neon:** Foi solicitado formulário de login via auth do Neon DB, mas como "última parte". Faremos uma versão mock/básica de Auth até concluirmos as telas e integrações de dados.

## Decisões Arquiteturais Confirmadas
- **Monorepo & Infraestrutura:** A estrutura do projeto será um monorepo, contendo pastas separadas para o frontend (React/Vite) e o backend (Node.js com Express para máxima compatibilidade e praticidade). Para a implantação em produção, utilizaremos o NGINX configurado como proxy reverso para otimizar e rotear as requisições entre o frontend e a API.

## Proposed Changes

### 1. Arquitetura de Banco de Dados (Neon DB)
Preservaremos os dados brutos de origem nas tabelas `associados_legado`, `progressao_legado`, `atividades_legado` e suas equivalentes do `paxtu100`. Criaremos tabelas auxiliares para manter a governança dos apontamentos manuais feitos pelos escotistas.

#### [NEW] Tabelas de Apontamento da Chefia (SQL)
- `ajustes_chefia`: Para armazenar inputs manuais de blocos e validações.
  - `id` (PK)
  - `id_associado` (FK)
  - `bloco_id` (1 a 18)
  - `acao_tipo` (Fixa ou Variável)
  - `valor` (Booleano ou Inteiro)
  - `data_apontamento` (Timestamp)
  - `origem` (ex: "Apontamento Manual Chefia")

### 2. Rotinas de ETL e Motor de Equivalência (Backend)
Um serviço em Node.js (ou função utilitária) para agregar dados do Paxtu Legado + Paxtu 100 + `ajustes_chefia`.

#### [NEW] `api/equivalencia.js`
Endpoint que retornará a visão consolidada de cada lobinho:
- **Parseamento Semântico:** Aplicar Regra dos 18 Blocos (mapeando "I1", "C5" etc. para os Blocos de 1 a 18 conforme a Seção 6 do doc de Transição).
- **Validação Booleana:** Marcar Ações Fixas como concluídas se existirem no histórico.
- **Avaliação Quantitativa:** Contar especialidades e atividades antigas para Ações Variáveis.
- **Cálculo de Status Tropa:** Retornar % e status (`Verde`, `Azul`, `Amarelo`, `Vermelho`) conforme regra de idade (9.5 a 10.5 anos).
- **Status do Distintivo:** Calcular "Pata-Tenra", "Saltador", "Rastreador", "Caçador" e alertar regressão.

### 3. Aplicação React: Portal de Transição (Frontend)
Um portal em React com Vite e Tailwind CSS, utilizando `lucide-react` para iconografia.

#### [NEW] `portal/src/App.jsx` (Single-File Component / Entrypoint)
O componente agrupará as principais seções (abas):
1. **Visão Geral:** KPIs (Total Lobinhos, Em Plano de Acompanhamento, Aptos ao Cruzeiro, Atrasados na Passagem).
2. **Painel de Equivalência:** Tabela (DataGrid) com as informações do ETL, exibindo a Barra de Progresso dos 18 Blocos.
3. **Cruzeiro do Sul:** Cards visuais (Checklist: 18 blocos, Reflexão, Roca, Caminho do Caçador).
4. **Caminho da Tropa:** Timeline com % de progressão e badges de status.

#### [NEW] Modal de Apontamento (`portal/src/components/ApontamentoModal.jsx`)
Formulário dinâmico acionado pela tabela de Equivalência. Exibirá as abas "Ações Fixas" (checkboxes) e "Ações Variáveis" (inputs numéricos), salvando as edições no banco de dados. Mostrará cabeçalho com alerta de regressão de distintivo.

#### [NEW] Assistente "Akela IA" (`portal/src/components/AkelaAgent.jsx`)
Um widget de chat flutuante.
- **Lógica:** No `useEffect`, analisará o estado global dos lobinhos retornado pela API.
- **Trigger Automático:** Se `regressao === true` ou `idade_tropa_critica === true`, Akela disparará um pop-up (ex: "Atenção! Joãozinho corre risco de perder o distintivo...").
- **Persona:** Linguagem escoteira, amigável.

## Verification Plan

### Automated Tests
- Testar as regras de conversão ETL:
  - Verificar se 8 atividades antigas convertem corretamente para os Blocos esperados.
  - Testar limite de não-regressão matemática.
- Validar cálculos de Idade (9.5 e 10.5 anos).

### Manual Verification
- Iniciar o app frontend (`npm run dev`) e validar as cores (Verde, Azul, Amarelo, Vermelho).
- Interagir com o Modal de Apontamento e salvar um ajuste, recarregando a página para confirmar persistência via API no Neon DB.
- Simular dados de um lobinho com regressão e verificar se o widget "Akela IA" dispara a notificação automática na carga do Dashboard.
