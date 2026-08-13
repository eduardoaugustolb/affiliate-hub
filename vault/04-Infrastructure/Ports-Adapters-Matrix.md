---
title: Matriz de Portas ↔ Adapters
tags:
  - architecture
status: living
created: 2026-08-06
updated: 2026-08-10
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
| `UserRepository` | [[03-Modules/IdentityAccess\|IdentityAccess]] | *pendente* — planejado `UserRepositorySql` |
| `SessionRepository` | [[03-Modules/IdentityAccess\|IdentityAccess]] | *pendente* — planejado `SessionRepositorySql` |
| `PasswordHasher` | [[03-Modules/IdentityAccess\|IdentityAccess]] | *pendente* — planejado adapter reaproveitável (`Argon2Hasher`), ver seção abaixo |
| `TokenGenerator` | [[03-Modules/IdentityAccess\|IdentityAccess]] | `CryptoTokenGenerator` |
| `DatabaseConnection` | Transversal (base de todo `*RepositoryDatabase`) | `PgAdapter` |
| `Cipher` | Transversal (usado por IdentityAccess hoje, LGPD cross-módulo) | `CipherAdapter` |
| `KeyedHasher` | Transversal (usado por IdentityAccess hoje — token e lookup de e-mail, cada um com sua própria chave) | `HmacKeyedHasher` — substitui o antigo `TokenHasher` |

## Onde cada adapter mora

Regra pra decidir o diretório de um adapter novo — evita a pasta de
composition root virar depósito genérico conforme o sistema cresce:

- **Porta pertence a um módulo específico** (`ProductRepository`,
  `UserRepository`, `ClickLog`, `BroadcastQueue`, etc.) → adapter mora
  **dentro do próprio pacote**: `packages/<módulo>/src/adapters/`. Padrão já
  seguido por `ProductRepositorySql` ([[03-Modules/Catalog\|Catalog]]) e
  `ClickLogSql` ([[03-Modules/LinkRedirect\|LinkRedirect]]) — os adapters de
  [[03-Modules/IdentityAccess\|IdentityAccess]] (`UserRepositorySql`,
  `SessionRepositorySql`, `PasswordHasherBun` etc.) seguem o mesmo lugar
  quando forem implementados.
- **Porta é transversal** (declarada em `shared-kernel`, sem módulo dono —
  `HttpServer`, `HttpRuntimeAdapter`, `DatabaseConnection`, `IdGenerator`,
  `HttpClient`, `Cipher`) → adapter mora em `services/api/src/adapters/`,
  porque é a composition root quem instancia e injeta essas dependências
  compartilhadas entre módulos (ver [[01-Architecture/Layers-Overview]]).
  **Critério pra decidir "é transversal ou não" não é "quantos módulos já
  usam hoje"** — `HttpClient`/`Cipher` só têm um consumidor real cada um
  (`AffiliateSync`, `IdentityAccess`) e mesmo assim são transversais desde
  o início. O teste real é: **a interface é tecnicamente genérica (sem
  semântica de domínio), ou é moldada pro problema de um módulo
  específico?** `Cipher` (`encrypt`/`decrypt` de qualquer string) não sabe
  se está cifrando e-mail ou telefone — mesma categoria de
  `DatabaseConnection`/`HttpClient`. `PasswordHasher` (`verify()` só faz
  sentido pra credencial) e `TokenGenerator`/`TokenHasher` (entropia de
  segredo, não de identificador) são moldados pro problema de auth — por
  isso ficam em `identity-access`, não em `shared-kernel`.
- **Código que não é um adapter de porta real** (ex.: implementação usada só
  pra comparação de performance, sem contrato completo do port) **não entra
  em `src/adapters/`** — mora em `services/api/bench/` ou equivalente.
  Achado real: `BunNativeHttpServer` não suporta `:params` dinâmicos (usado
  por [[03-Modules/LinkRedirect\|LinkRedirect]]/Catalog) — é baseline de
  benchmark, não substituto de produção do `HonoHttpServer`; não deveria
  ficar ao lado de adapter real.
- **Subdividir `services/api/src/adapters/` por categoria** (`http/`,
  `persistence/`, `crypto/` etc.) só quando passar de ~3 arquivos por
  categoria — regra de três, não criar subpasta pra 1 arquivo só por
  simetria (mesmo princípio de não abstrair além do necessário usado em
  [[03-Modules/CommentAssist]]).
- **Reaproveitar a implementação de um adapter entre módulos não exige
  promover a porta pra `shared-kernel`.** TypeScript é estrutural, não
  nominal — uma classe com os métodos certos satisfaz qualquer porta com
  aquela forma, mesmo sem declarar `implements` e mesmo que a porta seja
  local a um módulo diferente. Então, se `PasswordHasher`
  ([[03-Modules/IdentityAccess\|IdentityAccess]], moldado pra credencial —
  `verify()` só faz sentido pra senha) algum dia precisar da mesma
  primitiva argon2 em outro módulo, a solução **não** é promover a porta
  (especulação sem necessidade real comprovada — mesmo erro que corrigimos
  no `Cipher`) nem duplicar a implementação de cripto (isso sim seria
  duplicação cara/arriscada, bug de segurança precisaria ser corrigido duas
  vezes). A solução é: escrever o adapter concreto (`Argon2Hasher`) em
  `services/api/src/adapters/` — mesmo lugar de qualquer adapter transversal
  — **sem** declarar `implements PasswordHasher` explicitamente, e cada
  módulo que precisar dele declara sua própria porta local (mesmo que
  estruturalmente idêntica a `PasswordHasher`) e injeta a mesma instância.
  Repetir 3 linhas de interface é barato; duplicar lógica de cripto não é —
  compartilha o adapter, não a porta.

> [!note] Como manter esta tabela viva
> Toda vez que uma nova porta é declarada ou um adapter é adicionado/trocado,
> atualizar esta linha. Se uma porta aparece aqui sem nenhum adapter fake
> correspondente em teste, o módulo ainda não passa no
> [[08-DoD/Definition-of-Done|DoD]].
