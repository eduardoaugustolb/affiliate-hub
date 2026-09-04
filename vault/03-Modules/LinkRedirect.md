---
title: "Módulo 4: LinkRedirect"
tags:
  - module
  - module/link-redirect
status: implemented
created: 2026-08-06
updated: 2026-08-10
---

# LinkRedirect (Encurtador + QR)

> [!success] Implementado
> Pacote `packages/link-redirect`. 4 testes unitários (fakes) + coberto pelos
> testes de integração HTTP do `services/api`. Validado ponta a ponta contra
> Postgres real: `GET /p/:id` → `302 Found` com `Location` correto + clique
> gravado em `click_logs`.

## Responsabilidade

Servir `dominio.link/p/{id}` com redirecionamento 302 para o link
de afiliado vigente, registrando o clique.

## Casos de Uso

- `RedirectToAffiliateLink`: resolve identificador → link atual, loga
  clique, redireciona. Lança `NotFoundError` se o produto não existe ou não
  tem link de afiliado ainda (nesse caso o clique não é registrado).
- `RegisterClick`: analytics próprio, desacoplado do redirecionamento em si.
  Hoje é chamado só via `RedirectToAffiliateLink`; existe como caso de uso
  independente pra poder ser acionado por outro caminho no futuro (ex.: fila
  assíncrona) sem tocar em `RedirectToAffiliateLink`.

## Portas

- `PublishedProductReader`: porta mínima de leitura, com
  `findAffiliateLinkByCode(code): Promise<string | null>`. Só expõe o link de um
  produto publicado; o consumidor não conhece a entidade nem a persistência de
  Catalog.
- `ClickLog`: porta de analytics, com `ClickRecord { productId, clickedAt }`.
- `HttpServer`: porta de transporte, reaproveitada do `shared-kernel`
  (Hono hoje; trocar por outro é isolado aqui).

## Adapters

- `HonoHttpServer implements HttpServer`: vive em `services/api`, reaproveitado
  do Catalog (mesma instância de servidor, rotas registradas nela).
- `CatalogPublishedProductReader`: adapter de composição em `services/api`,
  traduz `ProductRepository` de [[Catalog]] para `PublishedProductReader` sem
  expor a dependência ao pacote LinkRedirect.
- `ClickLogDatabase implements ClickLog`: via `DatabaseConnection`, não
  conhece Postgres especificamente (ver
  [[02-Decisions/ADR-0002-database-connection-sem-orm]]).

## Domínio

O redirecionamento em si não precisa de entidade rica adicional. A porta
`PublishedProductReader` expõe apenas o link afiliado vigente por código. O
adapter só retorna o link quando o produto está `active`; portanto um produto
`inactive` não redireciona, mesmo que `affiliate_link_url` ainda esteja
preenchido. Produto inexistente, não publicado ou sem link resultam em 404 e
não registram clique.

`ClickRecord` é um registro de evento imutável (interface simples na própria
porta), não uma entidade com ciclo de vida próprio, módulo propositalmente
  enxuto nesse ponto, mesma lógica de design do [[CommentAssist]].

## Infraestrutura

- Migration própria (`packages/link-redirect/migrations`): tabela `click_logs`
  (`id`, `product_id`, `clicked_at`).
- **Knex tracking table isolada por pacote** (`tableName: 'link_redirect_migrations'`
  no `knexfile.ts`), achado real ao implementar: por padrão o Knex usa uma
  única tabela `knex_migrations` pro banco inteiro, então o migrator de um
  pacote tenta validar o histórico de migration de *outro* pacote e quebra
  com "migration directory is corrupt". Cada bounded context com persistência
  própria precisa da sua própria tabela de tracking, ver
  [[02-Decisions/ADR-0006-knex-apenas-para-migrations]] (atualizar esse ADR
  se mais módulos reproduzirem o padrão).

## Rota HTTP

`GET /p/:id` registrada em `services/api/src/http/linkRedirectRoutes.ts`,
somada às rotas de Catalog no mesmo `HonoHttpServer` (composition root em
`services/api/src/main.ts`).

## LGPD: Cookies e Rastreamento

`click_logs` hoje grava só `product_id` + `clicked_at`, sem dado pessoal,
contagem agregada de clique não fere a LGPD. **Antes de adicionar qualquer
"métrificador"** (cookie de dedupe, pixel de Meta/TikTok/Google) na página
do link-in-bio, seguir [[02-Decisions/ADR-0014-cookies-e-rastreamento-de-clique|ADR-0014]],
cookie/pixel não-essencial só dispara com consentimento explícito do
visitante, nunca por padrão. Ver checklist em [[09-Compliance/LGPD]].

## Ver também

[[05-Roadmap/Fase-2-Afiliacao]] · [[04-Infrastructure/Ports-Adapters-Matrix]] ·
[[09-Compliance/LGPD]]
