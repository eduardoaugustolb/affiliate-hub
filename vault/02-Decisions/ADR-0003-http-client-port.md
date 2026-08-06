---
title: ADR-0003 — Porta HttpClient
tags:
  - decision
  - layer/adapters
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# ADR-0003 — Porta `HttpClient` Própria pra Toda Chamada de Saída

## Contexto

Múltiplos módulos precisam fazer chamada HTTP de saída pra serviço externo:
`AffiliateSync` → Shopee API, possíveis integrações futuras (Shein, Mercado
Livre). O repo de referência ([[ADR-0008-arquitetura-de-referencia]]) já
resolve isso com uma porta `HttpClient` + `FetchAdapter`.

## Decisão

Porta `HttpClient`, implementada com `fetch` nativo do Bun. Toda integração
externa passa por essa porta — nunca `fetch`/`axios` direto dentro de um caso
de uso ou adapter de domínio específico (ex.: `ShopeeAffiliateProvider` recebe
`HttpClient` injetado, não importa `fetch` global).

## Alternativas Consideradas

- **`axios` direto dentro de cada adapter de integração**: rejeitado —
  duplica configuração de timeout/retry/header em cada integração e acopla
  cada adapter a uma lib HTTP específica, sem necessidade.

## Consequências

- Novo provedor de afiliado (`SheinAffiliateProvider`) reaproveita o mesmo
  `HttpClient` injetado, sem reconfigurar cliente HTTP.
- Retry/timeout/header default viram responsabilidade de um único lugar
  (`FetchHttpClientAdapter`), não espalhados por integração.

## Ver também

[[03-Modules/AffiliateSync]] · [[01-Architecture/Hexagonal-Ports-and-Adapters]]
