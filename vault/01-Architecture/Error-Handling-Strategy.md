---
title: Estratégia de Tratamento de Erro
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Tratamento de Erro

Erros de domínio/aplicação são tipados e distintos de erros de infraestrutura.

| Tipo | Onde nasce | Exemplo |
|---|---|---|
| `DomainError` | Dentro de uma entidade, violando invariante | `Product.activate()` sem foto aprovada |
| `ApplicationError` | Dentro de um caso de uso, orquestração inválida | Tentar aprovar mídia de produto já removido |
| `NotFoundError` | Repositório não encontra entidade | `findById` sem resultado |
| Exceção de infraestrutura | Adapter | timeout de rede, erro de driver de banco, falha de parsing |

## Mapeador de erro na borda

Cada adapter de entrada (`HonoAdapter`, `QueueConsumer`, comando de
cron) tem um `ErrorMapper` que traduz esses erros tipados pro formato
apropriado daquela borda:

- HTTP: `DomainError`/`ApplicationError` → `400`, `NotFoundError` → `404`,
  exceção não mapeada → `500` + log estruturado (nunca vaza stack trace pro
  cliente).
- Fila: erro de domínio → não retry (mensagem é descartada/DLQ), erro de
  infraestrutura → retry com backoff.

## Regra

Caso de uso e entidade **lançam** o erro tipado — nunca chamam `console.log`,
nunca decidem status HTTP, nunca sabem que existe uma fila. Quem decide o que
fazer com o erro é sempre o adapter de entrada, na borda.

## Ver também

[[Rich-Domain-Model]] (onde `DomainError` nasce) · [[Use-Case-Pattern]]
