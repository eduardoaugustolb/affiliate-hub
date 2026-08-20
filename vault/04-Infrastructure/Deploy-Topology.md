---
title: Topologia de Deploy
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-20
---

# Topologia de Deploy (Railway)

| Serviço (Railway) | Contém | Padrão de execução | Custo |
|---|---|---|---|
| `api` | HTTP e composição dos módulos | `bun run start` | Baixo |
| `affiliate-import-worker` | Consumo BullMQ de [[03-Modules/AffiliateSync\|AffiliateSync]] e integração com Catalog | `bun run worker`, sempre ativo | Baixo |
| `broadcast-worker` | [[03-Modules/Broadcast\|Broadcast]] (inclui processo Baileys) | Sempre ativo (WebSocket persistente) | Fixo, mas baixo (piso de custo do sistema) |
| `template-svc` | [[03-Modules/MediaTemplate\|MediaTemplate]] | HTTP sob demanda / fila | Baixo |

O processo HTTP e o worker pertencem hoje ao mesmo pacote
`services/api`, porém são entrypoints distintos: `src/main.ts` e
`src/entrypoints/worker/main.ts`. Compartilhar o pacote não os transforma no
mesmo processo. HTTP persiste a outbox e pede o job; o worker consome o job,
chama `DeliverAffiliateProductImport` e encerra a entrega.

O worker atual também agenda a reconciliação de enqueue a cada cinco minutos.
Esse agendamento não é o mecanismo normal de entrega e não deve introduzir
latência em uma importação com Redis disponível.

O worker expõe `GET /metrics` em `WORKER_METRICS_PORT` (9464 por padrão). O
endpoint deve permanecer acessível somente à rede do coletor de métricas em
homologação e produção.

## Banco e Storage

- **Banco**: Postgres hospedado no Supabase, acessado via protocolo Postgres
  puro pela porta `DatabaseConnection` (sem `@supabase/supabase-js` para
  dados, ver [[02-Decisions/ADR-0007-postgres-via-supabase-hosting]]),
  compartilhado entre módulos, cada módulo só acessa suas próprias tabelas via
  seu próprio adapter de repositório (sem acoplamento de schema entre módulos).
- **Object storage**: Cloudflare R2 (sem custo de egress).
- **Domínio de redirect**: `dominio.link` (ou equivalente curto), apontando
  pro serviço `api`.

## Repositório & CI

- **Repositório**: público no GitHub, `eduardoaugustolb/affiliate-hub`.
- **Versionamento**: Conventional Commits em pt-BR, sem `Co-Authored-By` nunca,
  ver [[02-Decisions/ADR-0012-conventional-commits-ptbr]] e
  `CONTRIBUTING.md` na raiz.
- **CI**: GitHub Actions (`.github/workflows/ci.yml`), roda em todo push/PR
  pra `main`: Postgres como service container, `bun run typecheck` em todos
  os pacotes (via `bun run --filter '*' typecheck`), testes unitários de
  `catalog`/`link-redirect`, migration real, testes de integração do `api`.

## Ver também

[[07-NFR/Requisitos-Nao-Funcionais]] (custo-alvo R$0-50/mês) ·
[[Ports-Adapters-Matrix]]
