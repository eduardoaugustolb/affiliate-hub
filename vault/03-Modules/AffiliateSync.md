---
title: Módulo 2 — AffiliateSync
tags:
  - module
  - module/affiliate-sync
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# AffiliateSync (Integração Shopee)

## Responsabilidade

Buscar produtos/comissões na Shopee Affiliate Open API (GraphQL + HMAC-SHA256),
gerar/atualizar links de afiliado e subIds a cada 3 dias.

## Casos de Uso

- `SyncAffiliateLinks` — para cada produto ativo, busca link fresco na
  Shopee, atualiza a entidade `AffiliateLink` associada ao produto.
- `ImportProductFromFeed` — traduz payload da Shopee em comando
  `RegisterProduct` (delegando ao módulo [[Catalog]] via porta, não import
  direto de classe).

## Portas

- `AffiliateProvider` — porta de domínio própria (**não** "ShopeeClient"!).
  Métodos como `findLink(externalProductId)`, `listUpdatedProducts()`.
  Isso é o ponto-chave: se amanhã for adicionado Shein ou Mercado Livre como
  fonte, é só escrever um novo adapter `SheinAffiliateProvider implements AffiliateProvider`
  — nenhum caso de uso muda.
- `TaskScheduler` — porta para dispor a rotina periódica (cron), abstrai o
  agendador real (Railway Cron, etc.)
- `HttpClient` — reaproveitada (ver [[02-Decisions/ADR-0003-http-client-port]])
  pelo `ShopeeAffiliateProvider` pra fazer a chamada GraphQL.

## Adapters

- `ShopeeAffiliateProvider implements AffiliateProvider` (GraphQL + HMAC-SHA256,
  chamadas feitas através da porta `HttpClient` — nunca `fetch` direto)
- `RailwayCronScheduler implements TaskScheduler`

## Domínio

`AffiliateLink` — value object/entidade associada a `Product`, guarda a URL
vigente + timestamp de última sincronização. Reatribuição de link é
comportamento explícito (`affiliateLink.update(newUrl)`), não substituição
de campo cru.

## Risco Conhecido

Acesso ao Shopee Affiliate Open API depende de aprovação/nível de afiliado —
validar antes de iniciar este módulo. Ver [[06-Risks/Riscos-Conhecidos]].
