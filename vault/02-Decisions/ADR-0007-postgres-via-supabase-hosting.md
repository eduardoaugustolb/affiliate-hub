---
title: ADR-0007 — Postgres via Supabase (Hosting)
tags:
  - decision
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0007 — Postgres Hospedado no Supabase, Acesso via Protocolo Puro

## Contexto

O projeto precisa de um Postgres gerenciado de baixo custo (alvo de R$0–50/mês
— ver [[07-NFR/Requisitos-Nao-Funcionais]]). Supabase oferece isso, mas seu
SDK (`@supabase/supabase-js`) tenderia a ser usado tanto pra dado quanto pra
Auth, o que colidiria com [[ADR-0002-database-connection-sem-orm|ADR-0002]].

## Decisão

Supabase é usado só como **hosting** do Postgres — acesso a dado passa pela
porta `DatabaseConnection` via protocolo Postgres puro (adapter `PgAdapter`),
nunca pelo client SDK `@supabase/supabase-js`. Nenhum módulo usa o SDK do
Supabase, nem `IdentityAccess` — ver [[ADR-0011-auth-caseiro-sem-supabase]].

## Alternativas Consideradas

- **`@supabase/supabase-js` também pra CRUD de dado** (rascunho inicial do
  PRD, corrigido): rejeitado — acopla repositório a um SDK de provedor
  específico, indo contra a garantia de "trocar de banco é trocar um adapter"
  (ver [[ADR-0002-database-connection-sem-orm]]).

## Consequências

- `ProductRepositoryDatabase` e demais repositórios funcionam contra qualquer
  Postgres, não só Supabase — migrar de hosting é trocar string de conexão,
  não reescrever adapter.
- `IdentityAccess` também não usa o SDK — auth é caseira desde
  [[ADR-0011-auth-caseiro-sem-supabase|ADR-0011]]. Supabase, no projeto
  inteiro, é só o host do Postgres: trocar de provedor de hosting nunca toca
  código de aplicação, em nenhum módulo.

## Ver também

[[03-Modules/IdentityAccess]] · [[04-Infrastructure/Deploy-Topology]] ·
[[ADR-0011-auth-caseiro-sem-supabase]]
