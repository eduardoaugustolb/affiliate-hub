---
title: "ADR-0005: Monorepo com Bun Workspaces"
tags:
  - decision
status: accepted
created: 2026-08-06
updated: 2026-08-20
---

# ADR-0005: Monorepo com Bun Workspaces

## Contexto

O sistema possui entrypoints HTTP e assíncronos. Hoje, `services/api` contém
o servidor HTTP e o `affiliate-import-worker` como processos distintos;
`broadcast-worker` e `template-svc` permanecem planejados. Os módulos cobrem
7 bounded contexts. Alguns
módulos se relacionam (ex.: `LinkRedirect` lê `Product` de `Catalog`) sem
poder importar função interna de outro módulo diretamente
(ver [[03-Modules/_Index|Módulos]]).

## Decisão

Monorepo com **Bun workspaces**. Cada bounded context
(seção [[03-Modules/_Index|Módulos]]) é um pacote interno com seu próprio
domain + application + ports. Cada serviço ou entrypoint monta seu próprio
composition root. Um entrypoint pode compartilhar um pacote de infraestrutura
enquanto possuir ciclo de vida e comando próprios, como `services/api/src/main.ts`
e `services/api/src/entrypoints/worker/main.ts`. Um serviço nunca importa a
composição interna de outro serviço.

## Alternativas Consideradas

- **Repos separados por serviço**: isolamento total de deploy/versionamento,
  mas exige publicar pacote privado (ou duplicar código) pra compartilhar
  entidade/porta entre módulos relacionados. Rejeitado: overhead
  desproporcional ao tamanho da equipe/projeto neste estágio.

## Consequências

- Fronteira de módulo é imposta por estrutura de pacote (workspace), não só
  por convenção de pasta; importar de fora do pacote exige que o pacote
  exporte explicitamente (via `package.json#exports` ou `index.ts`).
- Cada processo tem seu próprio entrypoint, ver
  [[04-Infrastructure/Deploy-Topology]].
- Módulos se comunicam via banco compartilhado e, quando cruzam processo, via
  fila, nunca chamando função interna de outro módulo diretamente (regra já
  vigente em [[03-Modules/_Index|Módulos]], reforçada pela fronteira de workspace).
