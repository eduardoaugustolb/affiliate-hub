---
title: Módulos (Bounded Contexts)
tags:
  - index
  - module
status: living
created: 2026-08-06
updated: 2026-09-03
---

# 🧩 Módulos (Bounded Contexts)

A aplicação é dividida em módulos de domínio, cada um seguindo a mesma
disciplina de camadas internamente (ver [[01-Architecture/_Index|Arquitetura]]).
Módulos se comunicam via banco compartilhado (Postgres) e, quando cruzam
processo, via fila, **nunca** chamando função interna de outro módulo
diretamente. A fronteira de domínio é a mesma independentemente de onde é
implantado (ver [[04-Infrastructure/Deploy-Topology]]).

## Módulos e serviços

A lista abaixo inclui os bounded contexts previstos e os serviços técnicos
existentes. O status executável de cada item está em [[Module-Status]].

| Módulo/serviço | Responsabilidade | Status |
|---|---|---|
| [[Catalog]] | Fonte de verdade dos produtos, curadoria e ciclo de vida | implementado |
| [[AffiliateSync]] | Integração e importação assíncrona de afiliados | implementado; feed pendente |
| [[IdentityAccess]] | Sessão e gestão de usuários do painel | implementado |
| [[LinkRedirect]] | Redirecionamento e analytics de cliques | implementado |
| [[AdminPanel-Status\|Admin Panel]] | Interface web administrativa | em andamento |
| [[MediaTemplate]] | Geração de imagem de post | roadmap |
| [[Broadcast]] | Distribuição no WhatsApp | roadmap |
| [[CommentAssist]] | Apoio a respostas no TikTok | roadmap |

## Comunicação Entre Módulos

- **Catalog → Broadcast / LinkRedirect**: via `EventPublisher`
  (`ProductActivated`, `ProductDeactivated`), nenhum import direto de classe
  entre pacotes de módulo. Os consumidores de Broadcast ainda são roadmap.
- **LinkRedirect → Catalog**: leitura via `PublishedProductReader`, uma porta
  mínima local ao LinkRedirect; `CatalogPublishedProductReader` faz a tradução
  na composition root. `CommentAssist` é roadmap e ainda não possui integração.
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

*Última atualização: 2026-09-03*
