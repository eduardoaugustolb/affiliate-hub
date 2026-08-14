---
title: "Catalog: guia linear de implementação"
tags:
  - module
  - module/catalog
  - architecture
status: living
created: 2026-08-14
---

# Catalog: do produto bruto ao produto publicável

Este é o guia principal para entender o pacote `packages/catalog`. Leia-o
antes de navegar pelos arquivos: ele explica qual problema o módulo resolve,
quais dados controla, como seus casos de uso se relacionam e por que as regras
vivem onde vivem.

## 1. O papel do Catalog

O Catalog é a **fonte de verdade dos produtos internos**. Integrações externas
podem sugerir produtos, curadores podem aprovar mídia e outros módulos podem
ler o produto, mas somente o Catalog decide se ele existe, em qual estado está
e se pode ser ativado.

Isso separa duas coisas que parecem iguais, mas não são:

```text
produto da Shopee  !=  Product do Catalog
```

O primeiro é dado externo e instável. O segundo é uma entidade interna com
regras. O [[AffiliateSync-Guia-Linear|AffiliateSync]] solicita uma importação;
o Catalog recebe essa solicitação e cria um produto em `draft`.

## 2. A estrutura dos dados

`Product` é a entidade central. Seus dados são expostos pelo `ProductSnapshot`:

| Dado | Para que serve |
|---|---|
| `id` | Identificador interno gerado pelo `IdGenerator`. |
| `name` | Nome exibido do produto. |
| `category` | Hoje: `streetwear` ou `perfume`. |
| `status` | `draft`, `active` ou `inactive`. |
| `photos` | URLs e estado de aprovação de cada foto. |
| `affiliateLinkUrl` | Destino de afiliação atualmente válido. |
| `mediaType` e `assignedTemplate` | Preparação para geração de mídia. |
| `createdAt`, `updatedAt`, `removedAt` | Histórico e soft delete. |

O banco persiste a entidade em `products`. Fotos ficam no campo JSONB `photos`;
links, status e metadados ocupam colunas próprias para consulta e atualização.

## 3. Ciclo de vida

```text
RegisterProduct
  -> draft
  -> adicionar/aprovar foto e atribuir link
  -> activate
  -> active
  -> deactivate
  -> inactive + removedAt
```

`draft` não é um erro nem um produto incompleto por acidente: é a fila de
curadoria. Ele pode ter vindo de uma integração, mas ainda não está apto para
ser publicado.

`inactive` também não apaga a linha. O produto é removido logicamente, com
`removedAt`; isso preserva links, rastreabilidade e dados históricos.

## 4. Onde estão as regras e por quê

As regras de negócio vivem na entidade `Product`, não nas rotas HTTP, nem no
repositório, nem no frontend. Por exemplo, `activate()` exige simultaneamente:

1. pelo menos uma foto aprovada;
2. um link de afiliado válido;
3. produto não removido.

Se qualquer requisito faltar, a entidade lança `DomainError`. Isso garante que
uma futura fila, uma rota nova ou um worker não consigam ativar um produto
ignorando a mesma regra.

O mesmo padrão vale para `approvePhoto`, `assignAffiliateLink`,
`assignTemplate` e `deactivate`: cada método protege o estado antes de mudar
o dado e atualiza `updatedAt`.

## 5. Os casos de uso, em ordem prática

### RegisterProduct

Recebe apenas `name` e `category`. Gera um id, chama `Product.createDraft()` e
persiste. Ele não ativa o produto, não inventa foto nem link. A saída é:

```ts
{ productId: string }
```

É usado pelo handler de importação de afiliação, mas o `AffiliateSync` não o
importa diretamente: a API conecta o evento ao caso de uso no lado do Catalog.

### ListProductsForCuration

Consulta `draft` e devolve snapshots. É a entrada natural de uma tela de
curadoria: ela vê produtos aguardando decisão sem poder editar a entidade em
memória diretamente.

### ApproveProductMedia

Busca o produto, aprova uma foto específica e opcionalmente atribui template.
Se `tryActivate` vier como `true`, tenta ativar; a entidade decide se os
pré-requisitos foram atendidos. Depois persiste. Se o estado passou a `active`,
publica `ProductActivated` na outbox.

### DeactivateProduct

Busca, executa `product.deactivate()`, persiste e publica
`ProductDeactivated`. O evento permite que outros módulos reajam sem o Catalog
chamar suas classes diretamente.

## 6. Persistência e portas

O caso de uso depende da interface `ProductRepository`, não de PostgreSQL.
`ProductRepositorySql` é o adapter que transforma `ProductSnapshot` em linhas
do banco e reconstrói a entidade usando `Product.rehydrate()`.

O mesmo vale para eventos: casos de uso dependem de `EventPublisher`;
`OutboxPublisherSql` grava uma linha em `outbox_events`. Assim, o domínio não
sabe SQL e a infraestrutura pode ser substituída ou testada com fakes.

```text
caso de uso -> porta -> adapter SQL -> Postgres
```

## 7. Eventos que o Catalog emite

| Evento | Quando acontece | Quem pode reagir |
|---|---|---|
| `ProductActivated` | Produto passa para `active`. | Broadcast, LinkRedirect e futuros consumidores. |
| `ProductDeactivated` | Produto é desativado. | Consumidores que precisam parar distribuição/uso. |

Eventos são persistidos na mesma infraestrutura de outbox documentada em
[[AffiliateSync-Guia-Linear]]. Publicar não significa chamar outro módulo;
significa gravar uma intenção durável para um dispatcher entregar depois.

## 8. Relação com AffiliateSync

Quando o dispatcher recebe `AffiliateProductImportRequested`, o handler de
entrada do Catalog abre uma transação, instancia `RegisterProduct` com o
repositório transacional e grava a associação:

```text
externalProductId -> productId
```

A tabela `affiliate_product_imports` impede criar dois produtos para a mesma
referência externa. Produto e associação são gravados na mesma transação: se
um falhar, ambos são revertidos. Detalhes operacionais estão no guia do
AffiliateSync porque a entrega começa naquele módulo.

## 9. Como investigar um produto

1. Comece em `products` pelo `id` ou nome.
2. Veja `status`, `photos` e `affiliate_link_url`.
3. Se veio de afiliação, consulte `affiliate_product_imports` pelo
   `product_id` ou `external_product_id`.
4. Para mudanças de estado, consulte `outbox_events` por `ProductActivated`
   ou `ProductDeactivated` e verifique `processed_at`/`last_error`.

## 10. Arquivos para ler depois deste guia

| Arquivo | Pergunta que responde |
|---|---|
| `src/domain/Product.ts` | Quais mudanças de estado são permitidas? |
| `src/domain/Photo.ts` | Como uma foto é validada e aprovada? |
| `src/application/use-cases/` | Qual é a orquestração de cada ação? |
| `src/application/ports/ProductRepository.ts` | O que o domínio exige da persistência? |
| `src/adapters/ProductRepositorySql.ts` | Como entidade e banco se convertem? |
| `src/adapters/OutboxPublisherSql.ts` | Como eventos saem do Catalog? |
| `test/` | Quais comportamentos são protegidos por testes unitários? |

## 11. Cuidados ao evoluir

- Não acrescente um `if` de regra de produto apenas na rota: coloque-a em
  `Product` quando ela for uma invariante.
- Não ative produto pelo banco nem por um adapter; use `activate()`.
- Não delete fisicamente um produto para “remover”: use `DeactivateProduct`.
- Não faça o Catalog importar classes internas de outro módulo. Integrações
  entram por eventos/handlers ou portas deliberadas.
- Não altere migrations aplicadas; crie uma migration nova.

## Referências

- [[Catalog]]: referência curta do módulo.
- [[AffiliateSync-Guia-Linear]]: importação confiável de produtos externos.
- [[01-Architecture/Rich-Domain-Model|Modelo de domínio rico]]: por que as
  regras vivem na entidade.
- [[01-Architecture/Hexagonal-Ports-and-Adapters|Ports & Adapters]]: por que
  os casos de uso dependem de portas.
- [[04-Infrastructure/Ports-Adapters-Matrix|Matriz de Portas ↔ Adapters]].
