---
title: "Fase 4: Distribuição"
tags:
  - roadmap
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Fase 4: Distribuição

[[03-Modules/Broadcast|Broadcast]] (Baileys) + [[03-Modules/CommentAssist|CommentAssist]].

## Entregáveis

- Pacote `broadcast`: `BaileysMessagingAdapter`, `SessionStorageDatabase`,
  `BroadcastQueueDatabase`, kill switch (`PauseBroadcast`/`ResumeBroadcast`).
- Serviço `broadcast-worker` deployável, sempre ativo.
- Pacote `comment-assist`: `GenerateReplyMessage`, integrado ao `api`.

## Atenção

Este é o módulo de maior risco operacional (ban de WhatsApp), ver
[[06-Risks/Riscos-Conhecidos]]. Healthcheck (ver
[[07-NFR/Requisitos-Nao-Funcionais]]) deve estar pronto antes de ativar em
produção.
