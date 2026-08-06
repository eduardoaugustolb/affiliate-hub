---
title: ADR-0001 — Bun como runtime/PM/bundler
tags:
  - decision
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0001 — Bun como Runtime, Package Manager e Bundler

## Contexto

O projeto precisa de um runtime TypeScript único em todos os serviços
deployáveis (`api`, `sync-worker`, `broadcast-worker`, `template-svc`). Decisão
levantada como não-negociável pelo usuário no início da discussão de
arquitetura.

## Decisão

Bun é usado como runtime, package manager e bundler em todos os serviços —
`bun install`, `bun build`, `bun run`. Sem Node.js, sem `tsx`/`tsup` no dev loop.

## Alternativas Consideradas

- **Node.js + tsx/tsup** (usado no repo de referência [[ADR-0008-arquitetura-de-referencia|drummerpva/erp]]):
  descartado — o usuário definiu Bun como indiscutível antes mesmo da
  discussão de arquitetura.

## Consequências

- `Bun.sql` (client Postgres nativo) vira candidato de adapter pra porta
  `DatabaseConnection` — ver [[ADR-0002-database-connection-sem-orm]].
- `fetch` nativo do Bun é a base do adapter de `HttpClient` — ver [[ADR-0003-http-client-port]].
- Teste: `bun:test` nativo em todo lugar — ver
  [[ADR-0010-bun-test-em-todo-lugar]] (a primeira tentativa foi Vitest,
  revertida por incompatibilidade com `Bun.SQL`).
- Monorepo usa Bun workspaces nativamente — ver [[ADR-0005-bun-workspaces-monorepo]].
