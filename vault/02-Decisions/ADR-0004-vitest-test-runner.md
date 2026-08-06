---
title: ADR-0004 — Vitest como Test Runner
tags:
  - decision
status: superseded
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0004 — Vitest como Test Runner

> [!warning] Substituído
> Superado por [[ADR-0010-bun-test-em-todo-lugar|ADR-0010]] — Vitest não
> consegue importar `bun:sql`/`"bun"` (ver contexto no ADR-0010), o que
> quebra teste de integração de qualquer adapter que use o driver nativo do
> Bun (ex.: `PgAdapter`). Mantido aqui só como registro histórico da decisão
> original e do porquê ela mudou.

## Contexto

Bun tem test runner nativo (`bun:test`), mas o repo de referência
([[ADR-0008-arquitetura-de-referencia]]) usa Vitest + Sinon + Nock. Pergunta
levada ao usuário: manter paridade com a referência ou usar o nativo do Bun.

## Decisão

Vitest, rodando sobre o runtime Bun. Escolhido explicitamente pelo usuário em
vez de `bun:test`.

## Alternativas Consideradas

- **`bun:test`**: nativo, zero dependência extra, `mock()` embutido
  substituiria Sinon — foi a opção recomendada, mas não escolhida
  (posteriormente adotada via [[ADR-0010-bun-test-em-todo-lugar|ADR-0010]]).

## Consequências

- Vitest + `@vitest/*` entravam como devDependency em cada pacote de
  workspace que tem teste — removido na migração do ADR-0010.
- Adapter fake/in-memory continua sendo o mecanismo de teste de caso de uso
  (não é exclusivo de nenhum test runner) — ver
  [[08-DoD/Definition-of-Done]].
