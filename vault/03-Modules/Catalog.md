---
title: "Módulo 1: Catalog"
tags:
  - module
  - module/catalog
status: implemented
created: 2026-08-06
updated: 2026-08-22
---

# Catalog (Gestão de Produtos)

> [!success] Implementado
> Pacote `packages/catalog`. 13 testes unitários (fakes) + 3 arquivos de
> integração contra Postgres real em `services/api/test/integration/catalog/`.
> Rotas HTTP registradas em `services/api/src/http/routes/catalogRoutes.ts`.

## Responsabilidade

Fonte de verdade dos produtos: cadastro, curadoria de mídia, ciclo de vida
(ativo/inativo), decisão de qual template de post usar.

## Domínio

### Entidade `Product` (rica, ver [[01-Architecture/Rich-Domain-Model]])

Arquivo: `packages/catalog/src/domain/Product.ts`.

Campos: id (`ProductId`), nome, categoria (streetwear/perfume),
status (`draft | active | inactive`), `mediaType`
(`catalog | lifestyle`), `assignedTemplate`, timestamps.

**Invariante que a entidade impõe a si mesma** (não o caso de uso): produto
não pode ser publicado (`active`) sem ter ao menos uma foto aprovada e link de
afiliado válido. Isso vive dentro de `Product.activate()`, lançando
`DomainError` se violado, não é um `if` no caso de uso.

Métodos de comportamento: `createDraft(...)` (factory estático), `rehydrate(...)`
(reconstrói a partir de snapshot do banco), `addPhoto`, `approvePhoto`,
`assignAffiliateLink`, `assignTemplate`, `activate`, `deactivate`, `toSnapshot`.
Nenhum setter público de campo que participe do invariante.

Produto **nunca é deletado fisicamente**, `deactivate()` só transita pra
`inactive` e preenche `removedAt`. Isso evita 404 em posts antigos e preserva
analytics.

### Value Object `ProductId`

Arquivo: `packages/catalog/src/domain/ProductId.ts`.

Código curto tipo `BBA-QES-MZN`, gerado uma vez, imutável, é a chave usada no
link, no QR e no overlay da imagem. Igualdade por valor, não por referência.

## Casos de Uso

Arquivos em `packages/catalog/src/application/use-cases/`.

- `RegisterProduct`: recebe dados normalizados, cria em `draft`. Ele é usado
  pelo handler de importação, mas não conhece AffiliateSync, BullMQ ou outbox.
- `RegisterManualProduct`: recebe nome, categoria e a URL original do produto
  Shopee. Pede a geração do link à porta `AffiliateLinkGenerator`, cria o
  produto em `draft` e associa somente o short link retornado. É o fluxo usado
  por `POST /products`; não usa outbox, Redis ou worker.
- `ApproveProductMedia`: curadoria humana aprova uma foto já existente no
  produto, opcionalmente atribui template e tenta ativar (`tryActivate`).
- `DeactivateProduct`: soft delete; publica `ProductDeactivated`.
- `ListProductsForCuration`: produtos em `draft` aguardando decisão humana.

## Portas

Arquivos em `packages/catalog/src/application/ports/`.

- `ProductRepository` (persistência): ver [[01-Architecture/Repository-Pattern]]
- `EventPublisher` (porta para publicar `ProductActivated`, `ProductDeactivated`,
  consumida pelos módulos [[Broadcast]] e [[LinkRedirect]] sem acoplamento direto)
- `AffiliateProductImportRegistry`: porta que preserva a identidade da origem
  externa por `(provider, externalProductId)`.

## Adapters

Arquivos em `packages/catalog/src/adapters/`.

- `ProductRepositorySql implements ProductRepository`: recebe
  `DatabaseConnection` injetada, não conhece Postgres nem nenhum outro banco
  especificamente (ver [[02-Decisions/ADR-0002-database-connection-sem-orm]])
- `OutboxPublisherSql implements EventPublisher`: tabela de outbox
  acessada via `DatabaseConnection`, evita depender de feature específica de
  um banco
- `AffiliateProductImportRegistrySql implements AffiliateProductImportRegistry`:
  consulta e salva `affiliate_product_imports` usando provider e identificador
  externo.

## Infraestrutura

Migration própria em `packages/catalog/migrations/`. Além de `products` e
`outbox_events`, Catalog mantém `affiliate_product_imports`. A chave primária
é `(provider, external_product_id)` e `product_id` é único. Essa estrutura
impede que reentregas de um mesmo produto externo criem produtos duplicados.

O handler de integração está em
`services/api/src/infrastructure/event-handlers/handleAffiliateProductImportRequested.ts`.
Ele abre uma transação, verifica o registry, executa `RegisterProduct` e salva
o vínculo. Em uma corrida, só trata a violação de unicidade como sucesso depois
de reler o vínculo existente.

## Ver também

[[02-Decisions/ADR-0007-postgres-via-supabase-hosting]] ·
[[07-NFR/Requisitos-Nao-Funcionais]] (nunca deleção física) ·
[[04-Infrastructure/Ports-Adapters-Matrix]] · [[Catalog-Guia-Linear]] ·
[[AffiliateSync]]
