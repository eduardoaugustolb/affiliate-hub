---
title: Módulo 5 — Broadcast
tags:
  - module
  - module/broadcast
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Broadcast (Grupo de WhatsApp via Baileys)

## Responsabilidade

Enviar automaticamente novo produto ativado para o grupo de WhatsApp, com
cadência controlada (throttle, humano-símile), usando fila persistente —
nunca disparo direto no evento.

## Casos de Uso

- `EnqueueProductForBroadcast` — reage a `ProductActivated` (assinando
  `EventPublisher` do módulo [[Catalog]]), insere item na fila com
  agendamento.
- `ProcessBroadcastQueue` — worker que consome a fila respeitando
  throttle/jitter, chama a porta de mensageria.
- `PauseBroadcast` / `ResumeBroadcast` — kill switch operacional.

## Portas

- `BroadcastQueue` (persistência da fila — pode ser tabela Postgres hoje,
  Redis/BullMQ amanhã)
- `MessagingClient` — porta central. **Este é o ponto que garante a troca
  fácil de lib de WhatsApp**: hoje `BaileysMessagingAdapter implements MessagingClient`,
  amanhã se precisar trocar por outra biblioteca (ou até por uma API oficial
  de Business, se surgir viabilidade), é um novo adapter —
  `ProcessBroadcastQueue` não muda uma linha.
- `SessionStorage` — porta separada para persistir `authState` do
  Baileys (crítico: não pode ser adapter de disco local em ambiente efêmero).

## Adapters

- `BaileysMessagingAdapter implements MessagingClient`
- `SessionStorageDatabase implements SessionStorage` — via
  `DatabaseConnection`
- `BroadcastQueueDatabase implements BroadcastQueue` — via
  `DatabaseConnection`, trocável por `BroadcastQueueRedis`/BullMQ no futuro
  sem tocar em `ProcessBroadcastQueue`

## Domínio

`QueueItem` — entidade com estado (`pending | sent | failed`) e
comportamento (`markSent()`, `scheduleRetry()`), não um registro passivo.
`PauseBroadcast`/`ResumeBroadcast` mexem num flag de configuração
operacional, lido por `ProcessBroadcastQueue` antes de cada envio.

## Risco Conhecido

Baileys é biblioteca não-oficial — risco de ban do número do WhatsApp mesmo
com cadência humano-símile. Mitigado por kill switch (`PauseBroadcast`) e
monitoramento ativo (ver [[07-NFR/Requisitos-Nao-Funcionais]] — healthcheck).
Ver [[06-Risks/Riscos-Conhecidos]].
