---
title: Riscos Conhecidos
tags:
  - risk
status: living
created: 2026-08-06
updated: 2026-08-10
---

# Riscos Conhecidos

Herdados das discussões anteriores ao PRD/vault.

## Ban de WhatsApp (Baileys)

Baileys é biblioteca não-oficial — risco de ban do número do WhatsApp mesmo
com cadência humano-símile. Mitigado por kill switch (`PauseBroadcast`) e
monitoramento ativo. Ver [[03-Modules/Broadcast]] ·
[[07-NFR/Requisitos-Nao-Funcionais]] (healthcheck).

## Sem Automação de Comentário no TikTok

Nenhuma automação de leitura/resposta de comentário no TikTok — decisão de
produto, não só técnica (violaria ToS). Ver [[03-Modules/CommentAssist]].

## Direito de Imagem em Fotos "Lifestyle"

Fotos "lifestyle" de review de terceiros (template `grid-colagem`) exigem
curadoria humana quanto a direito de imagem — não deve virar pipeline 100%
automático. Ver [[03-Modules/MediaTemplate]].

## Acesso à Shopee Affiliate Open API

Depende de aprovação/nível de afiliado — validar antes de iniciar o módulo
[[03-Modules/AffiliateSync]] (bloqueia [[05-Roadmap/Fase-2-Afiliacao]]).

## Não Conformidade com a LGPD

[[03-Modules/IdentityAccess]] trata dado pessoal (nome, e-mail) de titular
desde a implementação do login do painel — e-mail hoje em texto plano em
`users`, sem os fluxos de correção/eliminação exigidos pelo art. 18 da lei.
Risco de exposição de dado pessoal em caso de vazamento de banco/backup
enquanto a criptografia não for implementada. Ver
[[09-Compliance/LGPD]] (inventário e checklist completo) e
[[02-Decisions/ADR-0013-lgpd-criptografia-de-email|ADR-0013]] (decisão
técnica). Mitigação em andamento — não bloqueia o módulo em ambiente de
desenvolvimento, mas bloqueia deploy em produção com dado real de titular.

## Cookies e Pixel de Terceiro no Link-in-Bio

[[03-Modules/LinkRedirect]] vai ganhar "métrificadores" de clique — se
isso incluir cookie de rastreamento ou pixel de terceiro (Meta/TikTok/
Google) sem gate de consentimento, é tratamento de dado pessoal +
compartilhamento com outro controlador + transferência internacional sem
base legal, todos exigindo mitigação antes de ir ao ar. Contagem agregada
de clique (sem identificador de visitante) **não** é afetada por este
risco. Ver [[09-Compliance/LGPD]] e
[[02-Decisions/ADR-0014-cookies-e-rastreamento-de-clique|ADR-0014]].
