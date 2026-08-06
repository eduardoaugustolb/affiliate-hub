---
title: ADR-0005 — Monorepo com Bun Workspaces
tags:
  - decision
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0005 — Monorepo com Bun Workspaces

## Contexto

O sistema tem 4 serviços deployáveis na Railway (`api`, `sync-worker`,
`broadcast-worker`, `template-svc`) cobrindo 7 bounded contexts. Alguns
módulos se relacionam (ex.: `LinkRedirect` lê `Product` de `Catalog`) sem
poder importar função interna de outro módulo diretamente
(ver [[03-Modules/_Index|Módulos]]).

## Decisão

Monorepo com **Bun workspaces**. Cada bounded context
(seção [[03-Modules/_Index|Módulos]]) é um pacote interno com seu próprio
domain + application + ports. Cada serviço deployável é outro pacote que
importa só os módulos que roda e monta seu próprio composition root
(`main.ts`) — nunca importa de outro serviço deployável.

## Alternativas Consideradas

- **Repos separados por serviço**: isolamento total de deploy/versionamento,
  mas exige publicar pacote privado (ou duplicar código) pra compartilhar
  entidade/porta entre módulos relacionados. Rejeitado — overhead
  desproporcional ao tamanho da equipe/projeto neste estágio.

## Consequências

- Fronteira de módulo é imposta por estrutura de pacote (workspace), não só
  por convenção de pasta — importar de fora do pacote exige que o pacote
  exporte explicitamente (via `package.json#exports` ou `index.ts`).
- Cada serviço deployável tem seu próprio `main.ts` — ver
  [[04-Infrastructure/Deploy-Topology]].
- Módulos se comunicam via banco compartilhado e, quando cruzam processo, via
  fila — nunca chamando função interna de outro módulo diretamente (regra já
  vigente em [[03-Modules/_Index|Módulos]], reforçada pela fronteira de workspace).
