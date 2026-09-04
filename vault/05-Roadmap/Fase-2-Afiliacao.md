---
title: "Fase 2: Afiliação"
tags:
  - roadmap
status: accepted
created: 2026-08-06
updated: 2026-09-03
---

# Fase 2: Afiliação

[[03-Modules/AffiliateSync|AffiliateSync]] (Shopee) + [[03-Modules/LinkRedirect|LinkRedirect]] (encurtador + QR).

## Pré-requisito

Validar acesso à Shopee Affiliate Open API (aprovação/nível de afiliado) antes
de iniciar, ver [[06-Risks/Riscos-Conhecidos]].

## Entregáveis

- Pacote `affiliate-sync`: `ShopeeAffiliateProvider` sobre `HttpClient` e
  sincronização de feed pendente de operação homologada pela Shopee.
- Contrato compartilhado `AffiliateProductImportRequested`, outbox durável,
  job BullMQ `{ eventId }` e consumer em processo separado.
- `DeliverAffiliateProductImport` entrega o evento sem depender de BullMQ;
  Catalog mantém idempotência por `(provider, externalProductId)`.
- `outbox_events` registra `enqueued_at`, `enqueue_attempts`,
  `last_enqueue_error` e `processed_at`. O reconciliador de cinco minutos
  recupera somente falhas anteriores de enqueue no Redis.
- Pacote `link-redirect`: `HonoHttpServer`, `ClickLogSql`, rota de
  redirecionamento 302 no serviço `api`; QR code permanece no roadmap..
