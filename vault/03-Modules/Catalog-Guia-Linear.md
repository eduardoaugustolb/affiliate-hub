---
title: "Guia linear: Catalog"
tags:
  - module/catalog
  - guide
created: 2026-08-20
updated: 2026-08-20
---

# Guia linear: Catalog

`Catalog` é a fonte de verdade dos produtos. Ele mantém a entidade `Product`,
a curadoria e a identidade de produtos importados. Não sabe como BullMQ ou
Redis funcionam.

## 1. Cadastro normal

`RegisterProduct` cria um `Product` em estado `draft` por meio de
`ProductRepository`. A entidade decide suas próprias transições: por exemplo,
um produto não pode ficar `active` sem mídia aprovada e link afiliado válido.

## 2. Entrada de importação assíncrona

O ponto de entrada é o handler da API
`handleAffiliateProductImportRequested`. Ele recebe um evento já lido da
outbox por `DeliverAffiliateProductImport` e extrai:

```ts
{ provider, externalProductId, name, category }
```

O handler pertence à infraestrutura de composição porque traduz um contrato de
integração para casos de uso do Catalog. Ele não é exportado pelo pacote
Catalog e não é chamado pelo domínio.

## 3. Transação e identidade externa

A tabela `affiliate_product_imports` registra:

```text
provider + external_product_id -> product_id
```

`(provider, external_product_id)` é a chave primária. `product_id` é único.
Portanto, a implementação atual modela uma origem afiliada por produto.

Dentro de uma transação, o handler:

1. Confere se já existe o vínculo externo.
2. Cria o `Product` em draft quando não existe.
3. Salva o vínculo externo para o produto criado.

Se dois workers chegarem juntos, um deles vence a chave única. O outro relê o
vínculo e trata o conflito como sucesso idempotente, sem criar outro produto.

## 4. Relação com a outbox

Catalog não escreve `processed_at` do evento de importação. Essa é a conclusão
da entrega, feita por `DeliverAffiliateProductImport` somente após o handler
terminar. Se a gravação de `processed_at` falhar depois do commit de Catalog,
o job pode ser reentregue e o registry impede duplicação.

Catalog também possui sua própria publicação de eventos de domínio,
`OutboxPublisherSql`, usada para eventos como ativação e desativação. Essa
outbox não deve ser confundida com a entrega da importação afiliada.

## Ver também

[[Catalog]] · [[AffiliateSync-Guia-Linear]] · [[AffiliateSync]]
