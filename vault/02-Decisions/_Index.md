---
title: Decisões (ADRs)
tags:
  - index
  - decision
status: living
created: 2026-08-06
updated: 2026-08-06
---

# 📜 Decisões (ADRs)

Architecture Decision Records: cada decisão técnica não-óbvia vira uma nota
aqui, com contexto, alternativas consideradas e status. Nunca editar o
raciocínio de um ADR aceito, se a decisão mudar, criar um novo ADR e marcar
o antigo como `superseded`, linkando pro novo.

## Índice

| ADR | Decisão | Status |
|---|---|---|
| [[ADR-0001-bun-runtime-e-tooling]] | Bun como runtime/PM/bundler em todos os serviços | accepted |
| [[ADR-0002-database-connection-sem-orm]] | Porta `DatabaseConnection`, sem ORM, repositório agnóstico de banco | accepted |
| [[ADR-0003-http-client-port]] | Porta `HttpClient` própria pra toda chamada de saída | accepted |
| [[ADR-0004-vitest-test-runner]] | ~~Vitest como test runner~~ | superseded → [[ADR-0010-bun-test-em-todo-lugar]] |
| [[ADR-0005-bun-workspaces-monorepo]] | Monorepo com Bun workspaces | accepted |
| [[ADR-0006-knex-apenas-para-migrations]] | Knex só para migration, nunca query builder | accepted |
| [[ADR-0007-postgres-via-supabase-hosting]] | Postgres hospedado no Supabase, acesso via protocolo puro | accepted |
| [[ADR-0008-arquitetura-de-referencia]] | drummerpva/erp como arquitetura espelho | accepted |
| [[ADR-0009-idioma-codigo-vs-documentacao]] | Código em inglês, documentação em pt-BR | accepted |
| [[ADR-0010-bun-test-em-todo-lugar]] | `bun:test` em todo lugar, substitui Vitest | accepted |
| [[ADR-0011-auth-caseiro-sem-supabase]] | Auth caseiro, sem Supabase Auth | accepted |
| [[ADR-0012-conventional-commits-ptbr]] | Conventional Commits com descrição em pt-BR | accepted |
| [[ADR-0013-lgpd-criptografia-de-email]] | LGPD: e-mail criptografado em repouso, lookup via hash | accepted |
| [[ADR-0014-cookies-e-rastreamento-de-clique]] | LGPD: cookie/pixel de terceiro só com consentimento; contagem agregada de clique não é dado pessoal | proposed |

## Template pra novo ADR

```md
---
title: "ADR-000X: <título curto>"
tags:
  - decision
status: proposed
created: <data>
updated: <data>
---

## Contexto
<qual problema/força motivou a decisão>

## Decisão
<o que foi decidido, em uma frase>

## Alternativas Consideradas
<opções descartadas e por quê>

## Consequências
<trade-off aceito, o que fica mais fácil/difícil>
```

---

*Última atualização: 2026-08-10*
