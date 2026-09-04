---
title: Status real dos módulos
tags:
  - module
  - architecture
status: living
created: 2026-09-03
updated: 2026-09-03
---

# Status real dos módulos

Esta página é a fonte de verdade para distinguir capacidade existente de desenho
aprovado e roadmap. `implemented` significa que há código executável no
monorepo; `in-progress` significa que há uma implementação parcial; `roadmap`
significa que a documentação descreve uma intenção, não uma capacidade
entregável.

## Matriz de implementação

| Contexto/serviço | Código atual | Status | Persistência própria | Entrada/saída observável |
|---|---|---|---|---|
| `shared-kernel` | `packages/shared-kernel` | implemented | não | portas e erros compartilhados |
| `contracts` | `packages/contracts` | implemented | não | contratos HTTP e eventos |
| `Catalog` | `packages/catalog` | implemented | `products`, `outbox_events`, `affiliate_product_imports` | `POST /products`, curadoria e ciclo de vida |
| `AffiliateSync` | `packages/affiliate-sync` | implemented (feed pendente) | `outbox_events` (tabela e migration atualmente no Catalog) | importação assíncrona e worker BullMQ |
| `IdentityAccess` | `packages/identity-access` | implemented | `users`, `sessions` | sessão, setup e gestão da própria conta |
| `LinkRedirect` | `packages/link-redirect` | implemented | `click_logs` | `GET /p/:id` |
| `Admin Panel` | `services/admin-panel` | in-progress | não | frontend Next.js; depende da API |
| `MediaTemplate` | documentação apenas | roadmap | — | nenhum caso de uso implementado |
| `Broadcast` | documentação apenas | roadmap | — | nenhum worker ou adapter implementado |
| `CommentAssist` | documentação apenas | roadmap | — | nenhuma capacidade implementada |
| `API` | `services/api` | implemented | compõe bancos dos contextos | HTTP Hono/Bun e entrypoint de worker |

## Ownership e fronteiras

Cada contexto é dono lógico das tabelas listadas na matriz. O Postgres é
compartilhado fisicamente, mas migrations e repositórios pertencem ao pacote
dono. A exceção atual é `outbox_events`: a tabela é criada e mantida pelas
migrations do Catalog, embora AffiliateSync publique nela eventos de integração.
Leitura entre contextos ocorre por uma porta mínima ou por um handler de
integração; um pacote não importa entidades ou casos de uso internos de outro
contexto.

A exceção aparente `LinkRedirect → Catalog` é intencional: `LinkRedirect`
depende apenas de `PublishedProductReader`, uma porta local de leitura. O adapter
`CatalogPublishedProductReader`, em `services/api`, traduz o repositório do
Catalog na composition root. Portanto o pacote `link-redirect` não depende do
pacote `catalog`.

`AffiliateSync` publica `AffiliateProductImportRequested` na outbox. O handler
da API integra o evento ao Catalog dentro de uma transação, em vez de o
AffiliateSync chamar `RegisterProduct` diretamente.

## Eventos versionados

| Evento | Versão | Produtor | Transporte | Consumidor |
|---|---:|---|---|---|
| `AffiliateProductImportRequested` | `1` (implícita no contrato atual) | `ImportProductFromFeed` / `affiliate-sync` | `outbox_events` + BullMQ (`eventId`) | `DeliverAffiliateProductImport` e handler da API → Catalog |
| `ProductActivated` | `1` (evento de domínio interno) | `ApproveProductMedia` / Catalog | `EventPublisher` e outbox do Catalog | nenhum consumer executável hoje; Broadcast e LinkRedirect são roadmap/integração futura |
| `ProductDeactivated` | `1` (evento de domínio interno) | `DeactivateProduct` / Catalog | `EventPublisher` e outbox do Catalog | nenhum consumer executável hoje; consumidores documentados são roadmap |

A versão é mantida nesta tabela enquanto os contratos ainda não possuem um
campo `version`. Qualquer mudança incompatível exige atualizar o contrato, a
versão e todos os consumidores na mesma alteração.

## Convenções de status

- Documentos de módulos existentes descrevem arquivos reais e devem apontar
  pendências concretas.
- Documentos de módulos `roadmap` são designos aprovados; seus casos de uso,
  portas e adapters não podem ser apresentados como disponíveis na API.
- O README descreve comandos executáveis na raiz e separa a execução da API e
  do Admin Panel.

## Ver também

- [[03-Modules/_Index|Índice de módulos]]
- [[04-Infrastructure/Ports-Adapters-Matrix|Matriz de portas e adapters]]
- [[01-Architecture/_Index|Arquitetura]]
