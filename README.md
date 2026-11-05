# EstoquePro

Sistema web de **estoque de TI**: equipamentos (com patrimônio, etiquetas com QR code, termo de responsabilidade assinado na tela, manutenção e baixa com laudo), consumíveis, filiais, garantias, relatórios (Excel/CSV/PDF/XML), usuários, **cargos com permissões editáveis** e trilha de auditoria.

**Stack:** Node.js 20+ · Express 4 · PostgreSQL 16 · React 18 + Vite · Zod · JWT em cookie httpOnly.

## Estrutura

```
EstoquePro/
├── server/                  API (Node.js + Express)
│   ├── src/
│   │   ├── server.js        ponto de entrada (abre a porta, encerra com elegância)
│   │   ├── app.js           monta o Express (helmet, JSON, cookies, erros)
│   │   ├── rotas.js         ordem das rotas: públicas → autenticar → módulos
│   │   ├── config/          env.js (variáveis validadas) e constantes
│   │   ├── db/              pool.js (conexão, q e tx)
│   │   ├── lib/             utilitários: validadores, sql, erros, auditoria…
│   │   ├── middleware/      autenticacao.js (autenticar/exigir) e erros.js
│   │   ├── modules/         UM diretório por área: auth, usuarios, cargos, filiais,
│   │   │                    equipamentos, consumiveis, baixas, dashboard,
│   │   │                    relatorios, auditoria, permissoes
│   │   └── pdf/             termo, laudo, etiquetas, tabela
│   ├── db/                  schema.sql e migrations/
│   ├── scripts/             seed.js (1º admin) e migrar.js
│   └── tests/               testes de integração da API
├── client/                  Interface (React + Vite)
│   └── src/ pages/ components/ lib/ styles/
├── docs/                    documentação técnica (leia antes de alterar)
├── docker-compose.yml       PostgreSQL local
└── CHANGELOG.md
```

## Começando (desenvolvimento)

Pré-requisitos: Node.js 20.15+, Docker (ou um PostgreSQL 16 próprio).

```bash
# 1) Banco de dados
cp .env.example .env                 # defina DB_PASSWORD (senha forte)
docker compose up -d                 # cria o PostgreSQL e as tabelas

# 2) API
cd server
cp .env.example .env                 # preencha DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run migrar                       # aplica migrações pendentes (seguro em banco novo)
npm run seed                         # cria o administrador — depois APAGUE ADMIN_* do .env
npm run dev                          # http://127.0.0.1:3001

# 3) Interface (outro terminal)
cd client
npm install
npm run dev                          # http://localhost:5173  (o Vite encaminha /api para a API)
```

### Leitor de QR code no celular
A câmera do navegador só funciona em HTTPS. Em rede local: `cd client && npm run dev:celular`, descubra o IP do PC
e abra `https://IP-DO-PC:5173` no celular (aceite o aviso do certificado de teste). Use só em rede confiável: o servidor
de desenvolvimento não deve ficar exposto em redes públicas. Em produção use HTTPS de verdade (veja `docs/IMPLANTACAO.md`).

## Comandos úteis

| Onde | Comando | O que faz |
|---|---|---|
| server | `npm run dev` / `npm start` | API em modo desenvolvimento (recarrega) / produção |
| server | `npm run migrar` | aplica migrações pendentes (`-- --status` lista; `-- --baseline` marca como aplicadas) |
| server | `npm test` | testes de integração (exigem **banco de teste** — veja `docs/CONTRIBUINDO.md`) |
| server / client | `npm run lint` · `npm run format` | verifica / formata o código |
| client | `npm run build` · `npm test` | build de produção (`dist/`) · teste de fumaça das telas |

## Atualizando um banco já existente

```bash
cd server
npm run migrar -- --status      # veja o que está pendente
npm run migrar                  # aplica (cada migração em transação; é seguro repetir)
```
Faça **backup antes** (`docs/IMPLANTACAO.md`, seção Backup).

## Perfis padrão

`admin` (acesso total), `gestor`, `tecnico`, `consulta` — o que cada um pode é editável na aba **Cargos**
(catálogo de permissões em `server/src/modules/permissoes/catalogo.js`).

## Documentação

| Documento | Para quê |
|---|---|
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | como o sistema é organizado, ciclo de uma requisição, regras de negócio importantes |
| [docs/API.md](docs/API.md) | todos os endpoints, permissões exigidas e formatos |
| [docs/BANCO-DE-DADOS.md](docs/BANCO-DE-DADOS.md) | tabelas, relacionamentos e como criar migrações |
| [docs/SEGURANCA.md](docs/SEGURANCA.md) | controles implementados, rotação de segredos, riscos conhecidos |
| [docs/IMPLANTACAO.md](docs/IMPLANTACAO.md) | produção: variáveis, nginx/HTTPS, processo, backup |
| [docs/CONTRIBUINDO.md](docs/CONTRIBUINDO.md) | padrões de código e receitas ("como adiciono uma permissão/rota/tela?") |
