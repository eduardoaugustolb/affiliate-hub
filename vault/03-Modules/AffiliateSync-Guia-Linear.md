---
title: "AffiliateSync: guia linear de implementação"
tags:
  - module
  - module/affiliate-sync
  - architecture
status: living
created: 2026-08-14
---

# AffiliateSync: do problema ao código

Este documento é a leitura principal para entender o `AffiliateSync` e sua
relação com o [[Catalog]]. Ele foi escrito na ordem em que o sistema trabalha:
primeiro o problema, depois os dados, em seguida o fluxo em execução e, por
fim, as decisões que levaram à implementação. Os documentos de referência do
vault complementam este guia; não é necessário lê-los antes.

## 1. O problema que estamos resolvendo

A Shopee é uma fonte externa de produtos e links de afiliado. O [[Catalog]] é
a fonte de verdade interna: é ele que cria, guarda e governa o ciclo de vida
de `Product`. Portanto, uma resposta da Shopee **não é** um `Product` do
sistema. Ela é uma solicitação para que o Catalog crie um produto.

O problema parece simples — “recebi um produto, cadastre-o” — mas tem três
riscos importantes:

1. a Shopee ou a rede podem repetir uma entrega;
2. o Catalog pode estar temporariamente indisponível;
3. dois workers podem tentar tratar a mesma entrega ao mesmo tempo.

Criar o produto diretamente no `AffiliateSync` resolveria apenas o caminho
feliz e acoplaria os dois módulos. O desenho adotado preserva as fronteiras e
trata os três riscos acima.

## 2. Responsabilidades e fronteira entre módulos

| Componente | Dono | Responsabilidade |
|---|---|---|
| `AffiliateProvider` | AffiliateSync | Traduz API externa para dados do domínio de afiliação. |
| `ImportProductFromFeed` | AffiliateSync | Aceita um produto normalizado e solicita sua importação. |
| `outbox_events` | Infraestrutura | Guarda solicitações até que sejam tratadas. |
| `OutboxDispatcher` | Serviço/API | Retira uma solicitação da outbox e a entrega ao handler correto. |
| `handleAffiliateProductImportRequested` | Entrada do Catalog | Cria o produto pelo caso de uso `RegisterProduct`. |
| `affiliate_product_imports` | Integração | Guarda qual produto interno corresponde a cada id externo. |

O ponto mais importante é este: **`AffiliateSync` não importa `Catalog`**.
Ele conhece apenas o contrato compartilhado `AffiliateProductImportRequested`
e sua porta `IntegrationEventPublisher`. A API, que é a composition root,
conhece ambos os módulos e conecta as peças.

## 3. O formato dos dados

### 3.1 Comando recebido pelo AffiliateSync

`ImportProductFromFeed` recebe somente dados normalizados. Payload bruto da
Shopee não atravessa a aplicação:

```ts
{
  externalProductId: string,
  name: string,
  category: 'streetwear' | 'perfume'
}
```

`externalProductId` é a identidade do produto na fonte externa. Ele não é o
id do `Product` interno e não deve ser usado como tal.

### 3.2 Evento de integração

O comando vira `AffiliateProductImportRequested`:

```ts
{
  id: string,                 // id único da entrega
  name: 'AffiliateProductImportRequested',
  occurredAt: string,         // ISO-8601
  payload: { externalProductId, name, category }
}
```

O contrato está em `packages/contracts`, pois pertence à comunicação entre
módulos. Ele não fica em `affiliate-sync` nem em `catalog` para que nenhum
deles seja dono da API pública do outro.

### 3.3 Dados persistidos

`outbox_events` representa a entrega pendente. Campos relevantes:

| Campo | Significado |
|---|---|
| `event_id` | identificador estável da mensagem; único. |
| `name` e `payload` | tipo e conteúdo da mensagem. |
| `processed_at` | preenchido somente depois de sucesso. |
| `attempts`, `available_at`, `last_error` | estado de retry e diagnóstico. |
| `locked_until`, `lock_token` | lease que identifica o worker dono do processamento. |

`affiliate_product_imports` é o mapa de idempotência:

| Campo | Significado |
|---|---|
| `external_product_id` | chave primária; o id recebido da fonte. |
| `product_id` | produto criado pelo Catalog. |
| `imported_at` | momento em que a associação foi concluída. |

## 4. Fluxo de ponta a ponta

```text
1. provider normaliza o produto externo
2. ImportProductFromFeed cria o evento
3. OutboxIntegrationEventPublisherSql grava a outbox
4. OutboxDispatcher reserva uma linha pendente
5. handler do Catalog abre uma transação
6. RegisterProduct cria um Product draft
7. handler grava externalProductId -> productId
8. transação confirma
9. dispatcher marca a outbox como processada
```

Em forma de dependências:

```text
Shopee -> AffiliateSync -> contrato -> outbox -> dispatcher -> Catalog
```

Cada seta é deliberada. Não há chamada de `ImportProductFromFeed` para
`RegisterProduct`; o primeiro apenas publica uma intenção. O segundo só é
executado pelo handler que recebe essa intenção no lado do Catalog.

## 5. Por que usar outbox em vez de uma chamada direta

Uma chamada direta faz a disponibilidade do Catalog virar requisito para a
sincronização da Shopee. Se o Catalog falhar após a resposta externa chegar,
o produto se perde ou exige lógica manual de retry.

Com outbox, o sucesso de `ImportProductFromFeed` significa algo objetivo:
**a solicitação foi gravada no banco**. O dispatcher pode tratá-la agora ou
depois. É uma fila durável implementada com a infraestrutura já existente,
sem introduzir RabbitMQ ou Redis antes de haver necessidade comprovada.

O dispatcher roda periodicamente na API. A cada execução, ele tenta uma
linha. Sem eventos pendentes, retorna sem efeito.

## 6. Como o dispatcher evita erros difíceis

### Reserva e concorrência

Ao buscar uma linha, o dispatcher usa `FOR UPDATE SKIP LOCKED`, define
`locked_until` para cinco minutos e gera um `lock_token`. Dois dispatchers
podem rodar ao mesmo tempo, mas apenas um recebe uma linha específica.

Toda atualização posterior exige o mesmo `lock_token`. Se um worker antigo
terminar depois que seu lease expirou e outro worker reassumiu a linha, ele
não pode marcar o evento como concluído ou alterar seu retry por engano.

### Sucesso, falha e retry

Após o handler concluir, `processed_at` é preenchido. Em falha, a linha
continua pendente, registra `last_error` e recebe um novo `available_at`:

| Tentativa que falhou | Nova espera |
|---|---|
| 1 | 1 minuto |
| 2 | 5 minutos |
| 3 | 15 minutos |
| 4 ou mais | 1 hora |

Um evento sem handler também falha e é reagendado. Isso torna erro de
configuração visível em vez de descartar uma mensagem silenciosamente.

## 7. Por que a importação é idempotente e transacional

Reentregas são normais em sistemas de mensageria. O handler primeiro consulta
`affiliate_product_imports`; se o `externalProductId` já existe, não cria
nada e considera a entrega bem-sucedida.

Quando não existe, ele abre uma transação PostgreSQL. Dentro dela:

1. verifica novamente o vínculo (a primeira consulta pode ter corrido em
   paralelo com outro worker);
2. instancia `ProductRepositorySql` com a conexão transacional;
3. executa o `RegisterProduct` do Catalog;
4. salva o vínculo externo para o produto criado;
5. confirma a transação.

Se o vínculo falhar, a criação do produto também é revertida. Isso evita o
estado perigoso “produto existe, mas a fonte externa não sabe qual é”; esse
estado causaria duplicação na próxima tentativa.

A restrição única de `external_product_id` é a última proteção para uma
corrida rara. Se outro worker venceu a disputa, o handler confirma que o
vínculo existe e trata a entrega como sucesso.

## 8. Onde está cada parte no código

| Arquivo | Leitura recomendada |
|---|---|
| `packages/affiliate-sync/src/application/use-cases/ImportProductFromFeed.ts` | Comece aqui: transforma comando em evento. |
| `packages/affiliate-sync/src/adapters/OutboxIntegrationEventPublisherSql.ts` | Mostra a escrita durável na outbox. |
| `services/api/src/workers/OutboxDispatcher.ts` | Mostra claim, lease, sucesso e retry. |
| `services/api/src/workers/handlers/handleAffiliateProductImportRequested.ts` | Mostra a transação e a entrada do Catalog. |
| `services/api/src/adapters/database/AffiliateProductImportRegistrySql.ts` | Mostra o mapa de idempotência. |
| `packages/catalog/migrations/20260813000001...00003` | Mostra a evolução do schema. |
| `services/api/test/integration/affiliate-sync/importProductFromFeed.test.ts` | Prova o fluxo completo. |

## 9. O que a Shopee já faz e o que ainda depende dela

`ShopeeAffiliateProvider` gera link curto via `HttpClient`, usando configuração
de ambiente e assinatura SHA-256. Segredos não são versionados. A configuração
é opcional, mas é válida somente se todos os valores Shopee forem fornecidos.

Ainda não é possível importar um feed real porque faltam, do lado da Shopee:

- credencial e segredo aprovados;
- endpoint regional aprovado;
- contrato oficial da operação de feed: query, paginação, filtro por atualização
  e schema de categorias;
- formato homologado de `externalProductId` e URL do produto.

Por isso, `listUpdatedProducts()` falha explicitamente. Retornar uma lista
vazia fingiria que a sincronização foi bem-sucedida e esconderia o bloqueio.

## 10. Como ler e operar o sistema

Para diagnosticar uma importação, siga esta ordem:

1. procure o `event_id` em `outbox_events`;
2. se `processed_at` estiver vazio, veja `last_error`, `attempts` e
   `available_at`;
3. se estiver processado, procure `external_product_id` em
   `affiliate_product_imports`;
4. use o `product_id` encontrado para consultar `products`.

Para validar mudanças locais:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
DATABASE_URL=postgres://postgres:postgres@localhost:5433/drops_do_frost \
  bun --filter @affiliate-hub/api test:integration
```

## 11. Como evoluir sem desfazer as garantias

- Um novo provider (Shein, por exemplo) implementa `AffiliateProvider`; não
  altera o fluxo de outbox.
- Um novo tipo de evento ganha contrato, handler e teste; não reutilize um
  handler por semelhança superficial.
- Se a carga exigir, o dispatcher pode virar processo dedicado. Os leases e a
  outbox já permitem múltiplas instâncias.
- Não altere migrations aplicadas. Toda evolução de tabela exige nova migration.
- Não substitua o contrato por import direto de classes entre módulos. Esse
  atalho remove a independência que a outbox foi criada para preservar.

## Referências

- [[AffiliateSync]]: escopo e portas do módulo.
- [[Catalog]]: regras do produto e `RegisterProduct`.
- [[04-Infrastructure/Ports-Adapters-Matrix|Matriz de Portas ↔ Adapters]]:
  localização de portas e adapters.
- [[01-Architecture/Hexagonal-Ports-and-Adapters|Ports & Adapters]]: regra de
  dependências.
- [[05-Roadmap/Fase-2-Afiliacao|Fase 2: Afiliação]]: pré-requisitos e escopo.
