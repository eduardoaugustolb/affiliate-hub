---
title: Topologia de Deploy
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Topologia de Deploy (Railway)

| Serviço (Railway) | Contém | Padrão de execução | Custo |
|---|---|---|---|
| `api` | [[03-Modules/Catalog\|Catalog]], [[03-Modules/LinkRedirect\|LinkRedirect]], [[03-Modules/CommentAssist\|CommentAssist]], [[03-Modules/IdentityAccess\|IdentityAccess]] | HTTP sob demanda | Baixo |
| `sync-worker` | [[03-Modules/AffiliateSync\|AffiliateSync]] | Cron periódico (3 em 3 dias) | Quase zero |
| `broadcast-worker` | [[03-Modules/Broadcast\|Broadcast]] (inclui processo Baileys) | Sempre ativo (WebSocket persistente) | Fixo, mas baixo (piso de custo do sistema) |
| `template-svc` | [[03-Modules/MediaTemplate\|MediaTemplate]] | HTTP sob demanda / fila | Baixo |

Cada linha da tabela é um pacote de workspace com seu próprio `main.ts`
(composition root) — ver [[02-Decisions/ADR-0005-bun-workspaces-monorepo]].

## Banco e Storage

- **Banco**: Postgres hospedado no Supabase, acessado via protocolo Postgres
  puro pela porta `DatabaseConnection` (sem `@supabase/supabase-js` para
  dados — ver [[02-Decisions/ADR-0007-postgres-via-supabase-hosting]]) —
  compartilhado entre módulos, cada módulo só acessa suas próprias tabelas via
  seu próprio adapter de repositório (sem acoplamento de schema entre módulos).
- **Object storage**: Cloudflare R2 (sem custo de egress).
- **Domínio de redirect**: `dominio.link` (ou equivalente curto), apontando
  pro serviço `api`.

## Repositório & CI

- **Repositório**: público no GitHub, `eduardoaugustolb/affiliate-hub`.
- **Versionamento**: Conventional Commits em pt-BR, sem `Co-Authored-By` nunca
  — ver [[02-Decisions/ADR-0012-conventional-commits-ptbr]] e
  `CONTRIBUTING.md` na raiz.
- **CI**: GitHub Actions (`.github/workflows/ci.yml`), roda em todo push/PR
  pra `main` — Postgres como service container, `bun run typecheck` em todos
  os pacotes (via `bun run --filter '*' typecheck`), testes unitários de
  `catalog`/`link-redirect`, migration real, testes de integração do `api`.

## Ver também

[[07-NFR/Requisitos-Nao-Funcionais]] (custo-alvo R$0–50/mês) ·
[[Ports-Adapters-Matrix]]
