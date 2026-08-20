---
title: "Módulo 2: AffiliateSync"
tags:
  - module
  - module/affiliate-sync
status: implemented
created: 2026-08-06
updated: 2026-08-20
---

# AffiliateSync

## Responsabilidade

`AffiliateSync` recebe um produto já normalizado por um provider, registra a
intenção de importá-lo e solicita sua entrega assíncrona ao `Catalog`. Também
é dono das portas usadas para providers de afiliados e para a entrega da sua
outbox. Ele não cria `Product` diretamente e não importa casos de uso do
`Catalog`.

## Entrada de importação

`ImportProductFromFeed` recebe dados de domínio, nunca um payload bruto da
Shopee:

```ts
interface ImportProductFromFeedInput {
  externalProductId: string
  name: string
  provider: string
  category: 'streetwear' | 'perfume'
}

interface ImportProductFromFeedOutput {
  eventId: string
  queuedImmediately: boolean
}
```

O retorno não contém `productId`: o produto ainda será criado de forma
assíncrona. O evento foi aceito quando sua outbox foi persistida. Portanto,
`queuedImmediately: false` significa somente que Redis não recebeu o job
naquela tentativa; não significa perda do evento.

## Fluxo completo

```text
ImportProductFromFeed
  -> grava AffiliateProductImportRequested em outbox_events
  -> pede enqueue(eventId) pela porta AffiliateProductImportJobQueue
  -> sucesso: marca enqueued_at
  -> falha: incrementa enqueue_attempts e grava last_enqueue_error

BullMQ / Redis
  -> job { eventId }, jobId = eventId

BullMqAffiliateProductImportConsumer
  -> adapta job.data.eventId
  -> DeliverAffiliateProductImport.execute({ eventId })

DeliverAffiliateProductImport
  -> lê a outbox
  -> valida AffiliateProductImportRequested
  -> chama AffiliateProductImportRequestedEventHandler
  -> marca processed_at após sucesso

handler de integração da API
  -> chama RegisterProduct e AffiliateProductImportRegistrySql em transação
```

O consumer BullMQ não lê PostgreSQL e não chama Catalog diretamente.
`DeliverAffiliateProductImport` é o caso de uso que contém essa entrega; ele
não conhece BullMQ, Redis nem a classe `Worker`. Outro transporte pode chamar
o mesmo caso de uso com um `eventId`.

## Portas e implementações

| Porta | Função | Implementação atual |
| --- | --- | --- |
| `AffiliateProvider` | Buscar links e produtos do provider | `ShopeeAffiliateProvider` |
| `IntegrationEventPublisher` | Persistir o evento de integração | `SqlOutboxIntegrationEventPublisher` |
| `AffiliateProductImportJobQueue` | Solicitar `enqueue(eventId)` | `BullMqAffiliateProductImportJobQueue` |
| `OutboxEventDeliveryRepository` | Ler, registrar tentativa e concluir evento | `SqlOutboxEventDeliveryRepository` |
| `AffiliateProductImportRequestedEventHandler` | Processar o evento já lido | `handleAffiliateProductImportRequested` |
| `TaskScheduler` | Agendar reconciliação | `IntervalTaskScheduler` |

As portas e os casos de uso vivem em `packages/affiliate-sync/src/application`.
As implementações SQL vivem em
`packages/affiliate-sync/src/infrastructure/persistence/sql`. BullMQ, Redis,
o handler que integra Catalog e o entrypoint do processo ficam em
`services/api/src/infrastructure` e `services/api/src/entrypoints`.

## Recuperação de falha no Redis

O caminho saudável não faz polling. Depois de persistir a outbox,
`ImportProductFromFeed` tenta o enqueue imediatamente. Só se essa chamada
falhar o evento fica com `enqueued_at IS NULL`.

O processo worker agenda `ReconcilePendingOutboxEnqueues` a cada cinco
minutos. O caso de uso procura apenas eventos com:

```sql
enqueued_at IS NULL AND processed_at IS NULL
```

Ele tenta novamente criar o job e não executa handler nem altera
`processed_at`. Isso separa recuperação de disponibilidade do caminho normal
de baixa latência.

## Observabilidade do worker

`JsonLogger` emite uma linha JSON por log no stdout. Os logs do consumer usam
`eventId`, `jobId`, `attempt`, `queueName` e `durationMs`; falhas também
incluem `error.name`, `error.message` e `error.stack`.

O processo worker expõe `GET /metrics` na porta `WORKER_METRICS_PORT` (9464
por padrão). Ele combina as métricas Prometheus nativas do BullMQ, incluindo
os estados waiting, active, completed e failed, com três sinais da outbox:

- eventos de importação sem `processed_at` por mais de dez minutos;
- latência média de processamento dos últimos quinze minutos;
- maior latência de processamento dos últimos quinze minutos.

Prometheus ou Grafana Cloud podem coletar esse endpoint. A configuração de
alertas e a implantação em homologação são operações externas, não regras do
worker.

## Idempotência no Catalog

BullMQ oferece entrega pelo menos uma vez. A identidade da importação é
`(provider, externalProductId)`, persistida em `affiliate_product_imports`.
O handler verifica essa identidade antes e durante a transação. Uma violação
de unicidade concorrente é tratada como sucesso apenas quando o vínculo já
existe. Assim, reentregas e dois workers concorrentes não criam dois produtos.

## Provider Shopee

`ShopeeAffiliateProvider` usa `HttpClient`, constrói a mutation GraphQL de
short-link e assina a requisição com SHA-256. `listUpdatedProducts()` falha
explicitamente até haver operação de feed homologada pela Shopee. Não deve
retornar lista vazia, pois isso esconderia uma sincronização quebrada.

## Ver também

[[AffiliateSync-Guia-Linear]] · [[Catalog]] ·
[[04-Infrastructure/Ports-Adapters-Matrix]] ·
[[04-Infrastructure/Deploy-Topology]] ·
[[Shopee-Affiliate-Open-API]]
