---
title: "ADR-0014: Cookies e Rastreamento de Clique no LinkRedirect"
tags:
  - decision
  - compliance
status: proposed
created: 2026-08-10
updated: 2026-08-10
---

# ADR-0014: Cookies e Rastreamento de Clique (Pixels de Terceiro) no LinkRedirect

## Contexto

O link-in-bio (`GET /p/:id`, módulo [[03-Modules/LinkRedirect]]: "link
three") vai ganhar "métrificadores" (analytics de clique, possivelmente
pixel de terceiro tipo Meta/TikTok/Google pra remarketing). Hoje
`click_logs` grava só `product_id` + `clicked_at`, sem dado pessoal, ver
[[09-Compliance/LGPD]]. A pergunta que motiva este ADR:
**incrementar contador de clique fere a LGPD? E cookie/pixel?**

Resposta curta: **contagem agregada, sem identificador de pessoa, não é
tratamento de dado pessoal, não fere a LGPD.** O risco começa quando o
clique passa a carregar IP, user-agent completo, cookie/device-id, ou
quando um terceiro (Meta, TikTok, Google) recebe esse dado via pixel, aí
sim é tratamento de dado pessoal e a lei se aplica.

## Decisão

1. **Contagem agregada continua como está.** `click_logs(product_id,
   clicked_at)` é a fonte do dashboard de analytics do painel, sem IP, UA,
   cookie ou qualquer identificador. Isso não é dado pessoal (não
   identifica pessoa natural), não precisa de base legal nem consentimento,
   não muda.
2. **Qualquer campo que aumente a granularidade pra nível de
   dispositivo/pessoa** (IP, user-agent completo, cookie/device-id) só
   entra em produção com: base legal definida + (se for cookie
   não-essencial) gate de consentimento **antes** de gravar o dado.
3. **Pixel de terceiro (Meta, TikTok, Google Ads/Analytics) na página do
   link-in-bio não dispara antes de consentimento explícito do
   visitante.** Cookie de rastreamento publicitário é cookie
   **não-essencial** (finalidade de marketing/remarketing, não de operação
   do redirecionamento em si), base legal é consentimento (art. 7º, I),
   nunca legítimo interesse. A ANPD trata rastreamento publicitário
   comportamental como aplicação fraca de legítimo interesse, não é base
   defensável aqui.
4. **Log de conexão por obrigação legal (Marco Civil da Internet, art. 15,
   Lei 12.965/2014)** é assunto separado de analytics de marketing: se o
   projeto decidir guardar IP+timestamp de acesso por obrigação de guarda
   (aplicável a "provedor de aplicação de internet constituído como pessoa
   jurídica"), esse log vive numa tabela própria, TTL de exatamente 6
   meses, acesso restrito, e **nunca** reaproveitado pra perfilamento
publicitário, finalidade diferente da que autoriza a guarda (art. 6º,
    I, princípio da finalidade).
5. Página do link-in-bio ganha aviso de cookies/link pra política de
   privacidade antes de qualquer pixel de terceiro carregar, item de
   produto/frontend, não de backend.

## Alternativas Consideradas

- **Disparar pixel de terceiro direto, sem gate de consentimento**
  ("padrão de mercado", mas juridicamente frágil sob LGPD): rejeitado:
  combinar IP + device + comportamento de clique e compartilhar com
  Meta/Google/TikTok é tratamento de dado pessoal com outro controlador;
  exige base legal robusta, e legítimo interesse é posição fraca pra fins
  publicitários.
- **Gravar tudo (IP, UA, cookie) direto em `click_logs` "pra não perder
  dado depois"**: rejeitado: viola minimização (art. 6º, III); amplia
  superfície de risco sem necessidade concreta validada.
- **Não guardar nenhum log de conexão, nem separado**: pode conflitar com
  a obrigação do Marco Civil se o link-in-bio for entendido como
  "aplicação de internet" nos termos da lei, melhor manter essa guarda
  separada e limitada do que simplesmente não guardar nada.

## Consequências

- `RegisterClick`/`ClickLog` ([[03-Modules/LinkRedirect]]) seguem enxutos
  como hoje, nenhuma mudança de código motivada só por este ADR.
- Se pixel de terceiro for adicionado, é código da **página/frontend do
  link-in-bio**, não do backend `RedirectToAffiliateLink`, o mecanismo de
  consentimento (banner + gate de carregamento de script) é dessa camada,
  fora do escopo dos pacotes hexagonais atuais.
- Precisa de política de cookies/privacidade publicada **antes** de
  qualquer pixel ir ao ar, item de produto, não só técnico.
- Se decidir implementar o log de conexão do Marco Civil, é nova
  porta/tabela dedicada, não reaproveitar `click_logs` (finalidades
  diferentes não podem compartilhar o mesmo registro, princípio da
  finalidade).

## Status

`proposed`, nenhum pixel/cookie de rastreamento implementado ainda; ADR
serve de guia pra quando "métrificadores" forem de fato adicionados à
página do link-in-bio. Promover pra `accepted` quando a primeira decisão
concreta de tracking for tomada.

## Ver também

[[09-Compliance/LGPD]] · [[03-Modules/LinkRedirect]] ·
[[02-Decisions/ADR-0013-lgpd-criptografia-de-email]]
