---
title: "Guia linear: AffiliateSync"
tags:
  - module/affiliate-sync
  - guide
created: 2026-08-20
updated: 2026-08-20
---

# Guia linear: AffiliateSync

Este guia explica uma importação do primeiro dado recebido até sua conclusão
no Catalog. Leia [[AffiliateSync]] para a referência do módulo e esta página
para a sequência operacional.

## 1. O que entra

Um provider entrega um produto já normalizado. `ImportProductFromFeed` recebe
`provider`, `externalProductId`, `name` e `category`. Não recebe resposta
GraphQL crua, não chama `RegisterProduct` e não cria objetos BullMQ.

## 2. O que é gravado primeiro

O caso de uso gera um UUID `eventId` e persiste o evento completo
`AffiliateProductImportRequested` em `outbox_events`. Esse é o ponto de
aceitação: se a gravação falhar, não existe evento nem job para processar.

## 3. Como o job é criado

Depois da gravação, o caso de uso chama a porta
`AffiliateProductImportJobQueue.enqueue(eventId)`. A implementação BullMQ
cria o job abaixo no Redis:

```json
{ "eventId": "uuid-do-evento" }
```

O `jobId` é o próprio `eventId`; duas tentativas de enqueue do mesmo evento
não criam dois jobs. O job possui cinco tentativas e backoff exponencial.

Quando o enqueue funciona, `enqueued_at` é preenchido. Quando falha, a outbox
continua persistida, `enqueue_attempts` aumenta, `last_enqueue_error` registra
o motivo e a saída é `{ eventId, queuedImmediately: false }`.

## 4. Quem recebe o job

`bun run worker` inicia outro processo, separado do servidor HTTP. O
`BullMqAffiliateProductImportConsumer` só verifica se o payload contém um
`eventId` não vazio e chama:

```ts
delivery.execute({ eventId })
```

`delivery` é `DeliverAffiliateProductImport`. Isso é importante: BullMQ não
contém a regra de entrega. Um consumer SQS ou RabbitMQ poderia chamar o mesmo
caso de uso sem alterar a regra.

## 5. Como a entrega conclui

`DeliverAffiliateProductImport` busca o evento pelo `eventId` usando
`OutboxEventDeliveryRepository`.

- Evento inexistente: retorna `event-not-found`; o consumer conclui o job.
- Evento já com `processed_at`: retorna `already-processed`; Catalog não roda
  de novo.
- Nome inesperado: lança erro; a fila executa retry e torna o contrato inválido
  visível.
- Evento válido: chama `AffiliateProductImportRequestedEventHandler` e só
  então marca `processed_at`.

## 6. Como Catalog evita duplicação

O handler faz uma transação com `RegisterProduct` e
`AffiliateProductImportRegistrySql`. A identidade externa é
`(provider, externalProductId)`. Se já houver vínculo, nada é criado. Em
concorrência, a transação que perdeu a chave única relê o vínculo e encerra
como sucesso idempotente.

## 7. O que acontece quando Redis cai

Não existe espera fixa no caminho normal. A tentativa é imediata. A cada cinco
minutos, o worker roda `ReconcilePendingOutboxEnqueues`, que procura somente:

```sql
enqueued_at IS NULL AND processed_at IS NULL
```

Ele tenta criar o job novamente. Não chama Catalog e não preenche
`processed_at`.

## 8. Onde mexer para cada mudança

| Necessidade | Local |
| --- | --- |
| Nova regra de importação | `packages/affiliate-sync/src/application/use-cases` |
| Novo provider | `packages/affiliate-sync/src/infrastructure/providers` |
| Novo banco para a outbox | nova implementação de `OutboxEventDeliveryRepository` |
| Outra fila | novo consumer e nova implementação de `AffiliateProductImportJobQueue` em `services/api/src/infrastructure/queue` |
| Regra de criação de produto | `packages/catalog` ou handler de integração |

## 9. Como observar a operação

O worker escreve logs JSON no stdout. Cada job registra início, conclusão ou
falha com `eventId`, `jobId`, tentativa, fila e duração. Falhas preservam a
estrutura do erro.

O endpoint `GET /metrics` do worker, na porta `WORKER_METRICS_PORT` (9464 por
padrão), entrega métricas Prometheus da fila e da outbox. Os alertas devem
consumir ao menos:

- jobs em estado `failed`;
- `affiliate_import_outbox_unprocessed_over_ten_minutes > 0`;
- ausência de scrape do endpoint, que indica worker indisponível.

## Ver também

[[AffiliateSync]] · [[Catalog-Guia-Linear]] ·
[[04-Infrastructure/Ports-Adapters-Matrix]]
