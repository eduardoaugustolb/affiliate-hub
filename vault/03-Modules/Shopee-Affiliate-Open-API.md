---
title: "Referência: Shopee Affiliate Open API"
tags:
  - integration
  - integration/shopee
  - module/affiliate-sync
  - graphql
status: living
created: 2026-08-18
updated: 2026-08-18
source: "https://affiliate.shopee.com.br/open_api/document?type=overview"
---

# Referência da Shopee Affiliate Open API

Referência para o adapter `ShopeeAffiliateProvider` do [[AffiliateSync]],
conferida na área autenticada do Programa de Criadores e Afiliados Shopee em
2026-08-18. A documentação autenticada da Shopee permanece a fonte de verdade
para qualquer mudança de schema.

## Contrato de transporte

| Item | Valor |
|---|---|
| Protocolo | GraphQL sobre HTTP |
| Endpoint | `https://open-api.affiliate.shopee.com.br/graphql` |
| Método | `POST` |
| Content-Type | `application/json` |
| Limite informado | 8.000 chamadas/hora |
| Data regional | armazenada em UTC+ local; timestamp é o mesmo instante em qualquer fuso |

Ao exceder o limite, a plataforma recusa a solicitação até a próxima janela.

## Autenticação e assinatura

Todos os requests usam este header:

```http
Authorization: SHA256 Credential={appId}, Timestamp={unixSeconds}, Signature={sha256Hex}
```

`sha256Hex` é o SHA-256 em hexadecimal minúsculo (64 caracteres) de:

```text
SHA256(appId + timestamp + payload + secret)
```

Não há separador entre os componentes. `payload` é o corpo JSON **exato** que
será enviado: serialize-o uma única vez e reutilize a mesma string para assinar
e transmitir. Strings GraphQL que tenham aspas devem estar escapadas no JSON
antes do cálculo. O timestamp é Unix em segundos e não pode diferir mais de 10
minutos do relógio do servidor.

> [!important]
> `appId` identifica a integração e `secret` equivale a senha. Nunca gravar
> secret, payload assinado ou header `Authorization` em logs, código ou vault.
> Obtê-los de configuração de ambiente/gerenciador de segredos.

### Implementação de referência em TypeScript/Bun

```ts
import { createHash } from 'node:crypto'

const sha256 = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest('hex')

function signedHeaders(appId: string, secret: string, payload: string) {
  const timestamp = Math.floor(Date.now() / 1_000).toString()
  const signature = sha256(`${appId}${timestamp}${payload}${secret}`)

  return {
    Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
    'Content-Type': 'application/json',
  }
}

const payload = JSON.stringify({
  query: 'mutation { generateShortLink(input: { originUrl: "https://shopee.com.br/..." }) { shortLink } }',
})
// httpClient.post(endpoint, payload, { headers: signedHeaders(appId, secret, payload) })
```

## Envelope GraphQL e erros

O request possui `query` e, opcionalmente, `operationName` e `variables`:

```json
{
  "query": "...",
  "operationName": "...",
  "variables": { "myVariable": "someValue" }
}
```

`operationName` só é obrigatório quando houver mais de uma operação na mesma
query. Um HTTP 200 pode trazer falhas GraphQL; validar `data` e `errors`:

```json
{
  "data": { "...": "..." },
  "errors": [{ "message": "...", "path": "...", "extensions": {} }]
}
```

Sem erro, `errors` não é retornado. Os campos do erro são `message`, `path` e
`extensions` (detalhes). O adapter deve converter falhas de transporte,
autenticação, rate limit e erros GraphQL em erros de integração próprios, sem
vazar credenciais.

## Operações expostas

| Grupo | Operação/documentação | Operação GraphQL confirmada | Finalidade |
|---|---|---|---|
| Ofertas | Get Shopee Offer List | query `shopeeOfferV2` → `ShopeeOfferConnectionV2!` | Descoberta geral de ofertas |
| Ofertas | Get Brand Offer List | query `shopOfferV2` → `ShopOfferConnectionV2` | Busca por loja/marca |
| Ofertas | Get Product Offer List | consultar schema autenticado | Catálogo de produto |
| Ofertas | Get Product Feed Offer List | consultar schema autenticado | Importação por feed |
| Ofertas | Get Product Feed Offer Detail | consultar schema autenticado | Detalhe do feed |
| Links | Get Short Link | mutation `generateShortLink` → `ShortLinkResult!` | Link afiliado |
| Conversões | Get Conversion Report | query `conversionReport` → `ConversionReportConnection!` | Apuração de conversões |
| Conversões | Get Validated Report | consultar schema autenticado | Relatório validado |

“Consultar schema autenticado” é deliberado: a UI lista essas operações, mas
esta nota não presume nomes ou campos que não foram confirmados.

### Listas de ofertas

`shopeeOfferV2` recebe, entre outros, `keyword: String`, `sortType: Int`,
`page: Int` e `limit: Int`. `sortType` 1 ordena por atualização recente e 2
por maior comissão. O retorno contém `nodes` e `pageInfo`.

`shopOfferV2` recebe `shopId: Int64`, `keyword: String`, `shopType: [Int]`,
`isKeySeller: Bool` e `sortType: Int`. Tipos de loja mostrados: 1 oficial, 2
mall/preferred e 4 preferred plus. Ordenações: 1 recente, 2 maior comissão, 3
loja popular.

Em consultas com `scrollId`, a primeira página retorna no máximo 500 itens. O
token é obrigatório da segunda página em diante e expira em **30 segundos**;
não pode ser persistido para uma execução posterior.

### Geração de link curto

`generateShortLink` recebe `input` com:

- `originUrl: String!` — URL original da oferta/produto;
- `subIds: [String]` — rastreadores no conteúdo UTM; a Shopee informa suporte
  a cinco sub IDs.

O retorno é `shortLink: String!`. Esse resultado deve atualizar a entidade
`AffiliateLink`; persistir a URL e a data de sincronização, nunca as
credenciais.

### Relatório de conversões

`conversionReport` aceita `purchaseTimeStart`, `purchaseTimeEnd`,
`completeTimeStart` e `completeTimeEnd` (Unix), além de `shopName`, `shopId`,
`shopType`, `checkoutId` e `conversionId`. `checkoutId` está marcado como *to
be removed*; usar `conversionId` como identificador para idempotência.

Os valores exibidos para `shopType` são `ALL`, `SHOPEE_MALL_CB`,
`SHOPEE_MALL_NON_CB`, `C2C_CB`, `C2C_NON_CB`, `PREFERRED_CB` e
`PREFERRED_NON_CB`.

## Diretrizes para o AffiliateSync

1. Usar a porta `HttpClient` ([[02-Decisions/ADR-0003-http-client-port|ADR-0003]]),
   nunca `fetch` diretamente no caso de uso.
2. Construir, assinar e enviar o payload no adapter; não expor secret ao
   domínio/aplicação.
3. Aplicar rate limiting local conservador, métricas e backoff apenas para
   erros transitórios. Não repetir automaticamente mutation ambígua.
4. Processar páginas de modo idempotente e buscar a próxima antes de expirar o
   `scrollId`.
5. Manter fixtures sanitizadas e testes de contrato para detectar alterações de
   schema do fornecedor.

## Fluxo manual do MVP

O MVP não descobre nem importa produtos por feed. No formulário administrativo,
o operador informa a URL original de um produto Shopee. O fluxo é:

```text
POST /products { name, category, productUrl }
  → RegisterManualProduct
  → AffiliateLinkGenerator.generateAffiliateLink(productUrl)
  → ShopeeAffiliateProvider.generateShortLink(productUrl)
  → mutation generateShortLink na Shopee
  → Product draft com somente o shortLink retornado
```

`RegisterManualProduct` pertence ao Catalog e depende apenas da porta
`AffiliateLinkGenerator`. O adapter concreto Shopee pertence ao
AffiliateSync e é conectado em `services/api/src/main.ts`. Assim, Catalog não
importa código Shopee, e a troca de fornecedor fica limitada à composição.

## Checklist de produção

- [ ] AppId e secret provisionados no secret manager.
- [ ] Relógio do host sincronizado e assinatura coberta por teste com vetor conhecido.
- [ ] Corpo enviado é byte a byte igual ao corpo assinado.
- [ ] Campos selecionados revisados na área autenticada para a versão atual.
- [ ] Rate limit, observabilidade e retry definidos.
- [ ] Importações e conversões usam chave idempotente estável.
- [ ] Logs revisados contra vazamento de credentials, headers e URLs rastreáveis.

## Fonte

- [Open API Document — Shopee Affiliate](https://affiliate.shopee.com.br/open_api/document?type=overview)
- [API List — Shopee Affiliate](https://affiliate.shopee.com.br/open_api/list)

As páginas exigem sessão de afiliado autorizada.
