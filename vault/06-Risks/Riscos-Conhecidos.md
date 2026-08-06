---
title: Riscos Conhecidos
tags:
  - risk
status: living
created: 2026-08-06
updated: 2026-08-06
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
