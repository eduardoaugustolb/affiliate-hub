---
title: "Fase 2: Afiliação"
tags:
  - roadmap
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Fase 2: Afiliação

[[03-Modules/AffiliateSync|AffiliateSync]] (Shopee) + [[03-Modules/LinkRedirect|LinkRedirect]] (encurtador + QR).

## Pré-requisito

Validar acesso à Shopee Affiliate Open API (aprovação/nível de afiliado) antes
de iniciar, ver [[06-Risks/Riscos-Conhecidos]].

## Entregáveis

- Pacote `affiliate-sync`: `ShopeeAffiliateProvider` sobre `HttpClient`,
  `RailwayCronScheduler`, serviço `sync-worker`.
- Pacote `link-redirect`: `HonoAdapter`, `ClickLogDatabase`,
  rota de redirecionamento 302 no serviço `api`.
