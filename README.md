# Affiliate Hub (Drops do Frost)

Sistema de automação de afiliados para um perfil de streetwear + perfumes
(Shopee, Shein, Mercado Livre), cobrindo sincronização de produtos, geração de
imagens de post, encurtador de link com QR code, distribuição no WhatsApp e
painel administrativo de curadoria.

## Stack

- **Bun** como runtime, package manager, bundler e test runner.
- **TypeScript** em todos os pacotes e serviços.
- **Clean Architecture + Arquitetura Hexagonal** (Ports & Adapters), com a regra
  de dependência sempre apontando para dentro.
- **Postgres** como banco compartilhado, com **Knex** apenas para migrations.
- **Hono** como roteador HTTP (desacoplado da runtime via porta `HttpServer`).

A arquitetura de referência é o [drummerpva/erp](https://github.com/drummerpva/erp):
mesma disciplina de portas/adapters, caso de uso tipado e erro mapeado na borda.

## Estrutura

```
packages/
  shared-kernel/    Portas e tipos transversais (HttpServer, UseCase, erros)
  config/           Helper de validação de env vars com zod
  catalog/          Fonte de verdade dos produtos (cadastro, curadoria, ciclo de vida)
  link-redirect/    Encurtador próprio + QR code + log de cliques
  identity-access/  Autenticação por sessão e gestão de usuário (LGPD)
services/
  api/              Composition root do HTTP server (Hono sobre Bun.serve)
vault/              Docs de arquitetura, ADRs, módulos e LGPD (Obsidian)
PRD.md              Product Requirements Document
```

## Como rodar local

Pré-requisitos: [Bun](https://bun.sh) e Docker.

```bash
# 1. Sobe o Postgres local (porta 5433) e o DbGate (porta 8080)
docker compose up -d

# 2. Instala as dependências do monorepo
bun install

# 3. Configura as env vars da API
cp services/api/.env.example services/api/.env

# 4. Aplica as migrations de todos os módulos
bunx knex --knexfile knexfile.ts migrate:latest  # em packages/catalog
bunx knex --knexfile knexfile.ts migrate:latest  # em packages/link-redirect
bunx knex --knexfile knexfile.ts migrate:latest  # em packages/identity-access

# 5. Sobe a API em modo watch
bun run dev  # em services/api
```

## Comandos

| Comando | O que faz |
|---|---|
| `bun install` | Instala todas as workspaces |
| `bun run typecheck` | Typecheck de todos os pacotes e serviços |
| `bun run lint` | Lint com Biome |
| `bun run format` | Formata com Biome |
| `bun test` | Testes unitários (dentro de cada pacote) |
| `bun run test:integration` | Testes de integração da API (em `services/api`) |
| `bun --env-file=services/api/.env run test:coverage` | Suíte completa e bloqueio de cobertura global abaixo de 90% |
| `bun run bench:http` | Benchmark dos roteadores HTTP (em `services/api`) |

## Env vars da API

Todas as variáveis são obrigatórias (validadas com zod em `services/api/src/env.ts`):

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão com o Postgres |
| `PORT` | Porta do HTTP server (padrão 3000) |
| `TZ` | Timezone da aplicação (ex.: `UTC`) |
| `PII_ENCRYPTION_KEY` | Chave AES-256-GCM (base64url, 32 bytes) para e-mail em repouso |
| `EMAIL_LOOKUP_HMAC_KEY` | Chave HMAC para o lookup de e-mail (LGPD) |
| `SESSION_TOKEN_HMAC_KEY` | Chave HMAC para hashear tokens de sessão |

## Documentação

As docs vivem em `vault/`, num formato pronto para o Obsidian:

- **Arquitetura**: `vault/01-Architecture/`
- **Decisões (ADRs)**: `vault/02-Decisions/`
- **Módulos**: `vault/03-Modules/`
- **Infra e deploy**: `vault/04-Infrastructure/`
- **LGPD**: `vault/09-Compliance/LGPD.md`

Para contribuir, veja [CONTRIBUTING.md](CONTRIBUTING.md).
