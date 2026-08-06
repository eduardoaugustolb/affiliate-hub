---
title: ADR-0002 — DatabaseConnection sem ORM
tags:
  - decision
  - layer/adapters
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0002 — Porta `DatabaseConnection`, Sem ORM, Repositório Agnóstico de Banco

## Contexto

O repo de referência ([[ADR-0008-arquitetura-de-referencia|drummerpva/erp]])
não usa ORM: define uma porta `DatabaseConnection` (método `query`) e troca
livremente entre `MysqlAdapter`, `PgPromiseAdapter`, `SQLiteAdapter` sem tocar
em repositório. O primeiro rascunho deste projeto cometeu um erro ao nomear o
adapter de repositório como `ProductRepositoryDatabase` — vazando conhecimento
de banco específico pro nome/design do repositório. Corrigido a pedido
explícito do usuário: **"o repository não deve conhecer o postgres, ele deve
receber um DatabaseAdapter"**.

## Decisão

- Porta `DatabaseConnection` com método `query`, implementada por adapter fino
  (`PgAdapter`, via `postgres.js`/driver `pg`/`Bun.sql` — decisão de adapter,
  não de arquitetura).
- Toda classe `<Entidade>RepositoryDatabase` (ex.: `ProductRepositoryDatabase`)
  implementa a porta de domínio (`ProductRepository`) recebendo
  `DatabaseConnection` injetada no construtor. Ela só sabe montar SQL e chamar
  `query` — nunca importa `pg`, `postgres.js` ou qualquer driver diretamente.
- Nome de classe de repositório **nunca** carrega nome de banco
  (`ProductRepositoryDatabase`, não `ProductRepositoryDatabase`).

## Alternativas Consideradas

- **ORM (Drizzle/Prisma) atrás da porta de repositório**: rejeitado pelo
  usuário — ganharia produtividade e tipagem de schema, mas o adapter concreto
  fica mais gordo e a troca de banco é mais trabalhosa. Ver pergunta original
  respondida em favor de "SQL cru via porta".
- **`ProductRepositoryDatabase` usando `@supabase/supabase-js` pra dado**:
  rejeitado — acopla repositório ao SDK de um provedor específico de hosting,
  não só ao banco (ver [[ADR-0007-postgres-via-supabase-hosting]]). Nem Auth
  usa esse SDK — ver [[ADR-0011-auth-caseiro-sem-supabase]].

## Consequências

- Trocar de banco é trocar o adapter de `DatabaseConnection`
  (`PgAdapter` → `MysqlAdapter` → `SQLiteAdapter`) — repositório e caso de uso
  ficam intocados.
- Migration não é responsabilidade do repositório nem do adapter de conexão —
  ver [[ADR-0006-knex-apenas-para-migrations]].
- Todo `<Entidade>RepositoryDatabase` precisa de um `<Entidade>RepositoryFake`
  in-memory pra teste de caso de uso (critério em [[08-DoD/Definition-of-Done]]).

## Ver também

[[01-Architecture/Repository-Pattern|Repository Pattern]] ·
[[01-Architecture/Hexagonal-Ports-and-Adapters|Hexagonal Ports & Adapters]]
