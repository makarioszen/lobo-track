# Infraestrutura e Deploy - Portal de Transição da Alcateia

Este documento documenta as decisões de infraestrutura, organização de código e esteira de entrega projetadas para o sistema.

## 1. Topologia do Monorepo
A estrutura de diretórios adota um padrão de monorepo simplificado para maximizar a coesão no desenvolvimento.

```text
paxtu_teste/
 ├── portal/
 │    ├── frontend/             # SPA React + Vite + Tailwind
 │    │    ├── package.json
 │    │    ├── vite.config.js
 │    │    └── src/
 │    └── backend/              # Node.js + Express API
 │         ├── package.json
 │         └── src/
 ├── docs/                      # Documentações, especificações e relatórios (Markdown)
 ├── paxtu_legado/              # Scripts Puppeteer e extratores do sistema legado
 ├── paxtu100/                  # Scripts Puppeteer e extratores do sistema atualizado
 └── .env                       # Variáveis de ambiente compartilhadas (chaves do Neon DB)
```

## 2. Padrões de Deploy (Produção)
O sistema foi concebido para um deploy conteinerizado (Docker) ou hospedagem tradicional gerenciada (ex: VPS Linux).

### 2.1. NGINX Reverse Proxy
Para evitar problemas de CORS e manter tudo sob a mesma porta/domínio corporativo (`https://transicao.suauel.org.br`), utilizaremos o NGINX atuando como *Reverse Proxy* e servidor de arquivos estáticos.

**Mapeamento de Rotas (NGINX):**
- Tráfego `GET /` e estáticos (`.js`, `.css`, imagens):
  - O NGINX serve diretamente os arquivos gerados pela pasta `/portal/frontend/dist` (comando `npm run build` do Vite).
- Tráfego `GET/POST /api/*`:
  - O NGINX intercepta requisições iniciadas com `/api/` e realiza o `proxy_pass` encaminhando o tráfego internamente para a porta do processo Node.js (ex: `http://localhost:3000`).

### 2.2. O Serviço Node.js (Backend)
Em produção, o servidor Express será rodado utilizando um gerenciador de processos, como o **PM2** (`pm2 start backend/src/server.js`), ou via entrada primária do container Docker.
Ele garantirá que a conexão (Pool) com o banco de dados Neon permaneça saudável, sem a sobrecarga de iniciar do zero a cada chamada (cold starts severos) caso fosse 100% serverless.

## 3. Camada de Dados (Neon DB PostgreSQL)
- **Host:** Fornecido pela nuvem Serverless do Neon (escalabilidade on-demand).
- **Driver:** Utiliza `@neondatabase/serverless` para viabilizar conexões rápidas via WebSockets ou SQL strings simples no ecossistema JS.
- As migrações (`migrations`) e versionamento das tabelas deverão ser documentados, garantindo que as tabelas de `associados`, `progressao` e `ajustes_chefia` existam antes de o servidor ser instanciado.

## 4. Scripts Assíncronos de Extração (Cronjobs)
Os scripts legados que operam no Puppeteer (`extrator_completo.js` e `extrator_completo_paxtu100.js`) não farão parte do fluxo quente HTTP (não respondem chamadas de API do frontend devido ao alto tempo de espera).
**Estratégia:**
- Eles serão executados externamente, via tarefas agendadas (`crontab` Linux ou rotinas em background locais) para atualizar o Neon DB de tempos em tempos. O frontend consumirá apenas os dados que já estiverem sincronizados na nuvem.
