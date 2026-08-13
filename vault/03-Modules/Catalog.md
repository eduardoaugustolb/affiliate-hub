---
title: "Módulo 1: Catalog"
tags:
  - module
  - module/catalog
status: implemented
created: 2026-08-06
updated: 2026-08-06
---

# Catalog (Gestão de Produtos)

> [!success] Implementado
> Pacote `packages/catalog`. 13 testes unitários (fakes) + 3 arquivos de
> integração contra Postgres real em `services/api/test/integration/catalog/`.
> Rotas HTTP registradas em `services/api/src/http/catalogRoutes.ts`.

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

- `RegisterProduct`: recebe dados vindos da sincronização Shopee, cria em `draft`.
- `ApproveProductMedia`: curadoria humana aprova uma foto já existente no
  produto, opcionalmente atribui template e tenta ativar (`tryActivate`).
- `DeactivateProduct`: soft delete; publica `ProductDeactivated`.
- `ListProductsForCuration`: produtos em `draft` aguardando decisão humana.

## Portas

Arquivos em `packages/catalog/src/application/ports/`.

- `ProductRepository` (persistência): ver [[01-Architecture/Repository-Pattern]]
- `EventPublisher` (porta para publicar `ProductActivated`, `ProductDeactivated`,
  consumida pelos módulos [[Broadcast]] e [[LinkRedirect]] sem acoplamento direto)

## Adapters

Arquivos em `packages/catalog/src/adapters/`.

- `ProductRepositoryDatabase implements ProductRepository`: recebe
  `DatabaseConnection` injetada, não conhece Postgres nem nenhum outro banco
  especificamente (ver [[02-Decisions/ADR-0002-database-connection-sem-orm]])
- `OutboxPublisherDatabase implements EventPublisher`: tabela de outbox
  acessada via `DatabaseConnection`, evita depender de feature específica de
  um banco

## Infraestrutura

Migration própria em `packages/catalog/migrations/` (tabela `products` +
`outbox_events`), tracking table isolada (`tableName: 'catalog_migrations'`
no `knexfile.ts`, ver achado documentado em [[LinkRedirect]]).

## Ver também

[[02-Decisions/ADR-0007-postgres-via-supabase-hosting]] ·
[[07-NFR/Requisitos-Nao-Funcionais]] (nunca deleção física) ·
[[04-Infrastructure/Ports-Adapters-Matrix]]
