---
title: Módulos (Bounded Contexts)
tags:
  - index
  - module
status: living
created: 2026-08-06
updated: 2026-08-20
---

# 🧩 Módulos (Bounded Contexts)

A aplicação é dividida em módulos de domínio, cada um seguindo a mesma
disciplina de camadas internamente (ver [[01-Architecture/_Index|Arquitetura]]).
Módulos se comunicam via banco compartilhado (Postgres) e, quando cruzam
processo, via fila, **nunca** chamando função interna de outro módulo
diretamente. A fronteira de domínio é a mesma independentemente de onde é
implantado (ver [[04-Infrastructure/Deploy-Topology]]).

## Os 7 Módulos

| # | Módulo | Responsabilidade em uma frase |
|---|---|---|
| 1 | [[Catalog]] | Fonte de verdade dos produtos: cadastro, curadoria, ciclo de vida |
| 2 | [[AffiliateSync]] | Integração com Shopee Affiliate Open API |
| 3 | [[MediaTemplate]] | Geração de imagem de post a partir de template |
| 4 | [[LinkRedirect]] | Encurtador próprio + QR code |
| 5 | [[Broadcast]] | Distribuição automática no grupo de WhatsApp (Baileys) |
| 6 | [[CommentAssist]] | Apoio manual a resposta de comentário no TikTok |
| 7 | [[IdentityAccess]] | Autenticação do painel administrativo |

## Comunicação Entre Módulos

- **Catalog → Broadcast / LinkRedirect**: via `EventPublisher`
  (`ProductActivated`, `ProductDeactivated`), nenhum import direto de classe
  entre pacotes de módulo.
- **LinkRedirect / CommentAssist → Catalog**: leitura via `ProductRepository`
  compartilhado (mesma porta, reaproveitada como dependência de leitura).
- **AffiliateSync → Catalog**: `ImportProductFromFeed` grava
  `AffiliateProductImportRequested` na outbox e solicita o job Redis. O
  consumer entrega apenas `eventId` a `DeliverAffiliateProductImport`, que
  chama o handler de integração. O handler executa `RegisterProduct` sem
  import direto de caso de uso entre os pacotes. Reentregas são idempotentes
  por `(provider, externalProductId)`.

## Ver também

[[AffiliateSync-Guia-Linear|Guia linear de implementação do AffiliateSync]] ·
[[Catalog-Guia-Linear|Guia linear de implementação do Catalog]] ·
[[IdentityAccess-Setup-Inicial|Setup inicial concorrente do painel]] ·
[[Shopee-Affiliate-Open-API|Referência técnica da Shopee Affiliate Open API]] ·
[[02-Decisions/ADR-0005-bun-workspaces-monorepo|ADR-0005]], como isso vira
fronteira de pacote de workspace, não só convenção.

---

*Última atualização: 2026-08-20*
