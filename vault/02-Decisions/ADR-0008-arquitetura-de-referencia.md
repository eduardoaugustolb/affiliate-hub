---
title: "ADR-0008: Arquitetura de Referência (drummerpva/erp)"
tags:
  - decision
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0008: `drummerpva/erp` como Arquitetura Espelho

## Contexto

O usuário pediu que a arquitetura deste projeto fosse "quase idêntica (pode
ser idêntica)" à do repositório [drummerpva/erp](https://github.com/drummerpva/erp),
ignorando especificamente a estrutura de pastas/arquivos daquele repo ("eles
vão organizar melhor").

## Decisão

A **disciplina** do repo de referência é adotada integralmente:

- Caso de uso tipado `UseCase<Input, Output>`, um por ação.
- Porta declarada pela aplicação, nomeada em termos de domínio, nunca de tecnologia.
- Repositório que não conhece o banco por trás, recebe `DatabaseConnection`
  injetada (ver [[ADR-0002-database-connection-sem-orm]]).
- `HttpClient` como porta pra toda chamada de saída (ver [[ADR-0003-http-client-port]]).
- Erro tipado (`DomainError`/`ApplicationError`/`NotFoundError`) + `ErrorMapper`
  na borda (ver [[01-Architecture/Error-Handling-Strategy]]).
- `main.ts` único como composition root por serviço deployável.
- Migration via Knex, nunca como query builder em runtime (ver [[ADR-0006-knex-apenas-para-migrations]]).

A **estrutura de pastas** (flat, sem separação explícita por camada) **não** é
adotada; este projeto organiza por camada/módulo desde o início (ver
[[03-Modules/_Index|Módulos]]).

## Divergência Adicional Deste Projeto

- **Bun** no lugar de Node.js + tsx/tsup (ver [[ADR-0001-bun-runtime-e-tooling]]).
- **Entidade rica obrigatória** (ver [[01-Architecture/Rich-Domain-Model]]):
  o repo de referência tem entidades simples (ex.: `Bank`), não foi possível
  confirmar se seguem o mesmo rigor anti-anêmico; este projeto exige
  explicitamente.
- **Monorepo com Bun workspaces** desde o início, por ter 4 serviços
  deployáveis (o repo de referência é um único serviço), ver
  [[ADR-0005-bun-workspaces-monorepo]].

## Consequências

Qualquer decisão nova de tooling deve primeiro checar se o repo de referência
já resolveu o mesmo problema antes de introduzir uma abordagem diferente.
