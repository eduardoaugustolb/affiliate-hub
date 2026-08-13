---
title: "ADR-0010: bun:test em Todo Lugar"
tags:
  - decision
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0010: `bun:test` em Todo Lugar (Substitui Vitest)

## Contexto

Ao escrever o teste de integração de `ProductRepositoryDatabase` (rodando
contra Postgres real via `PgAdapter`), o Vitest falhou com
`Cannot find package 'bun' imported from .../PgAdapter.ts`. Causa raiz: o
Vitest executa o código através do próprio pipeline de transformação dele
(Vite/esbuild), não roda literalmente dentro do processo Bun, então
`import { SQL } from "bun"` (builtin específico do runtime Bun, ver
[[ADR-0002-database-connection-sem-orm]] e a implementação real do `PgAdapter`
usando [`Bun.SQL`](https://bun.sh/docs/runtime/sql)) não existe nesse sandbox.

Isso é um conflito direto entre duas decisões já tomadas: driver nativo do
Bun no `PgAdapter` (decidido pelo usuário) vs. Vitest como test runner
([[ADR-0004-vitest-test-runner|ADR-0004]], agora superado).

## Decisão

`bun:test` em todo lugar: unitário e integração, em todos os pacotes do
monorepo. Nenhuma dependência de test runner externa.

## Alternativas Consideradas

- **`bun:test` só pra integração, Vitest pro resto**: resolveria o problema
  técnico, mas mantém dois runners no monorepo sem necessidade, rejeitado
  pelo usuário em favor de simplicidade.
- **Manter Vitest, trocar `Bun.SQL` de volta pra `postgres`/`pg`**: resolveria
  o conflito pelo lado do driver, mas o usuário decidiu explicitamente pelo
  driver nativo do Bun antes desse problema aparecer, não fazia sentido
  reverter essa decisão por causa do test runner.

## Consequências

- `vitest`, `vitest.config.ts` e o devDependency correspondente foram
  removidos de `packages/catalog` e `services/api`.
- Scripts de teste viram `bun test` (unitário) e `bun test test/integration`
  (integração), sem arquivo de config adicional, `bun test` já descobre
  arquivos `*.test.ts` recursivamente.
- API de teste (`describe`, `it`, `expect`, `beforeEach`/`afterEach`) é
  compatível com Jest/Vitest, a migração dos arquivos de teste existentes foi
  só trocar o import de `'vitest'` pra `'bun:test'`, nenhuma asserção mudou.
- Teste de integração precisa de infraestrutura real rodando
  (`docker compose up -d db` + migration aplicada), não faz parte do
  `bun test` unitário padrão, só do script `test:integration` dedicado.
- Critério de aceite do [[08-DoD/Definition-of-Done|DoD]] não muda: teste de
  caso de uso continua rodando contra adapter fake/in-memory, agora só sob
  `bun:test` em vez de Vitest.

## Ver também

[[ADR-0002-database-connection-sem-orm]] · [[ADR-0004-vitest-test-runner]] ·
[[01-Architecture/Use-Case-Pattern]]
