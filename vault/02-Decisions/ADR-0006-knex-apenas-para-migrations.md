---
title: ADR-0006 — Knex Apenas para Migrations
tags:
  - decision
  - layer/adapters
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0006 — Knex Apenas para Migrations

## Contexto

Com [[ADR-0002-database-connection-sem-orm|ADR-0002]] decidido (sem ORM, SQL
cru via porta `DatabaseConnection`), falta uma ferramenta de migration
versionada. O repo de referência ([[ADR-0008-arquitetura-de-referencia]]) usa
Knex exclusivamente pra isso — nunca como query builder dentro de repositório.

## Decisão

Knex entra só como ferramenta de CLI de migration (`knex migrate:latest`,
`knex migrate:rollback`). Cada pacote de bounded context que tem tabela
própria mantém seu diretório de migrations. Knex **nunca** é importado dentro
de um `<Entidade>RepositoryDatabase` ou de qualquer caso de uso — a fronteira
é estrita: Knex versiona schema, `DatabaseConnection` executa query em runtime.

## Alternativas Consideradas

- **SQL puro versionado manualmente (sem ferramenta de migration)**:
  descartado — perde tracking de qual migration já rodou em cada ambiente,
  reinventa o que Knex já resolve.
- **Knex como query builder também em runtime**: descartado — reintroduziria
  acoplamento a uma lib específica dentro do repositório, contrariando
  [[ADR-0002-database-connection-sem-orm]].

## Consequências

- Cada módulo com persistência própria ganha um `knexfile.ts` e diretório
  `migrations/` dentro do seu pacote de workspace.
- Scripts `db:migrate` / `db:rollback` por pacote, iguais ao padrão do repo de
  referência.

## Ver também

[[01-Architecture/Repository-Pattern]] · [[ADR-0002-database-connection-sem-orm]]
