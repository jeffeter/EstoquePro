# Changelog

## 1.0.0 — Reorganização, endurecimento de segurança e documentação (03/11/2026)

Versão final funcional **preservada**: a API refatorada foi validada contra a original com 120 chamadas de teste
(`server/tests/api.test.js`); o comportamento é idêntico, exceto as correções listadas em "Segurança" e "Correções".

### Organização
- Backend: o `routes.js` de 532 linhas foi dividido em **módulos por domínio** (`modules/<área>/`), cada um com `*.routes.js`
  (HTTP: validação, permissão, resposta) e `*.service.js` (regras de negócio e SQL). Nenhuma regra mudou de lugar sem teste.
- `pdf.js` dividido em `pdf/` (termo, laudo, etiquetas, tabela, peças comuns).
- Frontend: o `App.jsx` de 531 linhas foi dividido em `pages/`, `components/` e `lib/`.
- Código formatado (Prettier) e verificado (ESLint) no servidor e no cliente; `npm run lint` / `npm run format`.
- Migrações agora têm controle (`schema_migrations`) e um comando único: `npm run migrar`.
- Arquivos não utilizados removidos do pacote: `server/assets/eq-claro.png`, `eq-escuro.png`, `logo.jpeg`.

### Segurança
- Segredos: removidos do pacote o `.env` com credenciais e o `.env.example` que continha um `JWT_SECRET` e uma senha reais.
  **Troque** o JWT_SECRET, a senha do administrador e a senha do banco (veja `docs/SEGURANCA.md`, seção "Rotação").
- Configuração validada na partida (`config/env.js`): a API não inicia com segredo curto/de exemplo.
- `docker-compose.yml` sem senha fixa (usa `DB_PASSWORD`).
- API escuta só em `127.0.0.1` por padrão; `trust proxy` configurável (IP real do cliente atrás do nginx).
- JWT: algoritmo fixado em HS256 e token só com o `id` (nome/cargo/permissões vêm do banco a cada requisição).
- Falha de banco não vira mais "401 Não autenticado" (vira 500 e é logada).
- Limite de login conta só tentativas **falhas**; login bem-sucedido passa a ser auditado (`login.ok`).
- Senha limitada a 72 caracteres (limite real do bcrypt), seed recusa senhas previsíveis.
- Limites de tamanho em todos os textos de entrada; `id` de URL validado em todas as rotas.
- Auditoria "melhor esforço": falha ao gravar o log não transforma ação concluída em erro 500; entradas sanitizadas.
- Respostas da API com `Cache-Control: no-store`; erros do PostgreSQL mapeados sem vazar detalhes.
- Encerramento gracioso (SIGTERM), timeout de consulta (30 s), `GET /api/health`.
- `tema.js` externalizado do HTML (permite CSP sem `unsafe-inline` em scripts).
- Dependências atualizadas; `zod` 3 → 4 (vulnerabilidade de severidade alta). Detalhes e riscos aceitos em `docs/SEGURANCA.md`.

### Correções
- `id` não numérico na URL (ex.: `/api/equipamentos/abc/historico`) retornava **500**; agora retorna **400**.
- Cadastro de consumível passa a ser registrado na auditoria (`consumivel.criar`).

### Documentação
- `README.md`, `docs/ARQUITETURA.md`, `docs/API.md`, `docs/BANCO-DE-DADOS.md`, `docs/SEGURANCA.md`, `docs/IMPLANTACAO.md`, `docs/CONTRIBUINDO.md`.
