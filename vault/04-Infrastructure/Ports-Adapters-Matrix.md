---
title: Matriz de Portas ↔ Adapters
tags:
  - architecture
status: living
created: 2026-08-06
updated: 2026-08-06
---

# Matriz de Portas ↔ Adapters

Visão consolidada de toda porta do sistema e seu(s) adapter(s) — útil pra
checar rapidamente o critério de aceite "toda dependência externa está atrás
de uma porta" (ver [[08-DoD/Definition-of-Done]]).

| Porta | Módulo | Adapter(s) concreto(s) |
|---|---|---|
| `ProductRepository` | [[03-Modules/Catalog\|Catalog]] | `ProductRepositoryDatabase` |
| `EventPublisher` | [[03-Modules/Catalog\|Catalog]] | `OutboxPublisherDatabase` |
| `AffiliateProvider` | [[03-Modules/AffiliateSync\|AffiliateSync]] | `ShopeeAffiliateProvider` (futuro: `SheinAffiliateProvider`) |
| `TaskScheduler` | [[03-Modules/AffiliateSync\|AffiliateSync]] | `RailwayCronScheduler` |
| `HttpClient` | Transversal (usado por AffiliateSync hoje) | `FetchHttpClientAdapter` (Bun `fetch`) |
| `BackgroundRemover` | [[03-Modules/MediaTemplate\|MediaTemplate]] | `RembgBackgroundRemover` |
| `ImageRenderer` | [[03-Modules/MediaTemplate\|MediaTemplate]] | `SatoriImageRenderer` |
| `FileStorage` | [[03-Modules/MediaTemplate\|MediaTemplate]] | `CloudflareR2Storage` |
| `QRCodeGenerator` | [[03-Modules/MediaTemplate\|MediaTemplate]] | `QRCodeNpmAdapter` |
| `HttpServer` | [[03-Modules/LinkRedirect\|LinkRedirect]] | `HonoAdapter` |
| `ClickLog` | [[03-Modules/LinkRedirect\|LinkRedirect]] | `ClickLogDatabase` |
| `BroadcastQueue` | [[03-Modules/Broadcast\|Broadcast]] | `BroadcastQueueDatabase` (futuro: Redis/BullMQ) |
| `MessagingClient` | [[03-Modules/Broadcast\|Broadcast]] | `BaileysMessagingAdapter` |
| `SessionStorage` | [[03-Modules/Broadcast\|Broadcast]] | `SessionStorageDatabase` |
| `UserAuthenticator` | [[03-Modules/IdentityAccess\|IdentityAccess]] | `UserAuthenticatorDatabase` |
| `DatabaseConnection` | Transversal (base de todo `*RepositoryDatabase`) | `PgAdapter` |

> [!note] Como manter esta tabela viva
> Toda vez que uma nova porta é declarada ou um adapter é adicionado/trocado,
> atualizar esta linha. Se uma porta aparece aqui sem nenhum adapter fake
> correspondente em teste, o módulo ainda não passa no
> [[08-DoD/Definition-of-Done|DoD]].
