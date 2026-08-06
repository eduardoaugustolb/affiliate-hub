---
title: Fase 1 — Fundação
tags:
  - roadmap
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Fase 1 — Fundação

[[03-Modules/Catalog|Catalog]] (CRUD + soft delete) + [[03-Modules/IdentityAccess|IdentityAccess]] (auth caseira) + banco Postgres (Supabase).

## Por que primeiro

Catalog é a entidade central (`Product`) da qual todo outro módulo depende
(leitura, pelo menos). IdentityAccess é pré-requisito pra qualquer painel de
curadoria. Sem essas duas peças, nenhum outro módulo tem o que consumir.

## Entregáveis

- Pacote de workspace `catalog` com domain (`Product` rico —
  ver [[01-Architecture/Rich-Domain-Model]]), application (`RegisterProduct`,
  `ApproveProductMedia`, `DeactivateProduct`, `ListProductsForCuration`) e
  ports.
- `ProductRepositoryDatabase` + `PgAdapter` + migration via Knex.
- `UserAuthenticatorDatabase implements UserAuthenticator` (auth caseira, ver
  [[02-Decisions/ADR-0011-auth-caseiro-sem-supabase|ADR-0011]]).
- Serviço `api` deployável com composition root mínimo.

## Ver também

[[08-DoD/Definition-of-Done]] — critério pra considerar esta fase pronta.
