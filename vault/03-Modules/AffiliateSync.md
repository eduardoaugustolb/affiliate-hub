---
title: "Módulo 2: AffiliateSync"
tags:
  - module
  - module/affiliate-sync
status: accepted
created: 2026-08-06
updated: 2026-08-13
---

# AffiliateSync (Integração Shopee)

## Responsabilidade

Buscar produtos/comissões na Shopee Affiliate Open API (GraphQL + HMAC-SHA256),
gerar/atualizar links de afiliado e subIds a cada 3 dias.

## Casos de Uso

- `SyncAffiliateLinks`: para cada produto ativo, busca link fresco na
  Shopee, atualiza a entidade `AffiliateLink` associada ao produto.
- `ImportProductFromFeed`: normaliza um produto vindo do provider e publica
  uma solicitação de importação para o [[Catalog]]. Não chama
  `RegisterProduct`, nem acessa `ProductRepository`.

### Contrato de `ImportProductFromFeed`

O input é o produto já normalizado na fronteira do provider, nunca o payload
bruto específico da Shopee:

```ts
interface ImportProductFromFeedInput {
  externalProductId: string
  name: string
  category: 'streetwear' | 'perfume'
}

interface ImportProductFromFeedOutput {
  eventId: string
}
```

Ao aceitar o comando, o caso de uso publica o evento de integração
`AffiliateProductImportRequested`, cujo payload contém exatamente o input e
cujo contrato mora em um pacote compartilhado de contratos (não em
`affiliate-sync` nem em `catalog`). O `eventId` confirma que o evento foi
gravado de forma durável; não representa um `productId`, que só existirá após
o processamento pelo Catalog.

## Comunicação com Catalog

`AffiliateSync` e `Catalog` não importam casos de uso, entidades ou
repositórios um do outro. A sequência é assíncrona:

```text
ImportProductFromFeed
  -> IntegrationEventPublisher
  -> outbox_events
  -> worker/dispatcher
  -> handler do Catalog
  -> RegisterProduct
```

O handler é uma entrada do Catalog no serviço de composição. Ele consome
`AffiliateProductImportRequested` e executa o seu próprio `RegisterProduct`;
isso mantém o acoplamento na infraestrutura, fora dos dois módulos.

O consumidor deve ser idempotente: persiste uma associação única
`externalProductId -> productId` antes de considerar o evento processado.
Reentregas do mesmo evento não podem criar outro produto.

## Portas

- `AffiliateProvider`: porta de domínio própria (**não** "ShopeeClient"!).
  Métodos como `findLink(externalProductId)`, `listUpdatedProducts()`.
  Isso é o ponto-chave: se amanhã for adicionado Shein ou Mercado Livre como
  fonte, é só escrever um novo adapter `SheinAffiliateProvider implements AffiliateProvider`,
  nenhum caso de uso muda.
- `TaskScheduler`: porta para dispor a rotina periódica (cron), abstrai o
  agendador real (Railway Cron, etc.)
- `IntegrationEventPublisher`: porta para gravar um evento de integração de
  forma durável. O caso de uso depende somente dela, não da tabela de outbox
  nem do consumidor.
- `HttpClient`: reaproveitada (ver [[02-Decisions/ADR-0003-http-client-port]])
  pelo `ShopeeAffiliateProvider` pra fazer a chamada GraphQL.

## Adapters

- `ShopeeAffiliateProvider implements AffiliateProvider` (GraphQL + HMAC-SHA256,
  chamadas feitas através da porta `HttpClient`, nunca `fetch` direto)
- `RailwayCronScheduler implements TaskScheduler`
- `OutboxIntegrationEventPublisher implements IntegrationEventPublisher`:
  grava o evento em `outbox_events`; o adapter pode ser compartilhado
  estruturalmente entre módulos, sem compartilhar a porta de domínio.

## Outbox e consumidor

A outbox atual registra `name`, `payload` e `occurred_at`, mas ainda não tem
um consumidor. Antes de ativar este fluxo, ela precisa ganhar identificador
único do evento e estado de processamento, no mínimo `processed_at`. Um
worker deve buscar eventos pendentes, entregar cada um ao handler adequado e
preencher `processed_at` somente após sucesso. Falhas permanecem pendentes
para nova tentativa.

## Domínio

`AffiliateLink`: value object/entidade associada a `Product`, guarda a URL
vigente + timestamp de última sincronização. Reatribuição de link é
comportamento explícito (`affiliateLink.update(newUrl)`), não substituição
de campo cru.

## Risco Conhecido

Acesso ao Shopee Affiliate Open API depende de aprovação/nível de afiliado:
validar antes de iniciar este módulo. Ver [[06-Risks/Riscos-Conhecidos]].
