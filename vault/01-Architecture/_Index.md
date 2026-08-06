---
title: Arquitetura
tags:
  - index
  - architecture
status: living
created: 2026-08-06
updated: 2026-08-06
---

# 🏛️ Arquitetura

O sistema segue **Clean Architecture** combinada com **Arquitetura Hexagonal
(Ports & Adapters)**. Isso não é um layout de pastas — é uma disciplina de
dependência. Ver [[Dependency-Rule]] pra regra central.

## Notas desta seção

- [[Layers-Overview]] — as 4 camadas e o que cada uma pode/não pode conhecer
- [[Dependency-Rule]] — a regra inegociável que sustenta tudo o resto
- [[Hexagonal-Ports-and-Adapters]] — portas declaradas pela aplicação, adapters substituíveis
- [[Rich-Domain-Model]] — por que entidades são ricas, nunca anêmicas, e como fazer isso
- [[Use-Case-Pattern]] — `UseCase<Input, Output>`, injeção de porta, não de adapter
- [[Repository-Pattern]] — porta de persistência definida em termos de domínio
- [[Error-Handling-Strategy]] — erro tipado + mapeador na borda

## Critério de Aceite

O critério prático de "a arquitetura está sendo seguida" está descrito em
[[08-DoD/Definition-of-Done|Definition of Done por Módulo]]: trocar um adapter
concreto nunca deve exigir editar um caso de uso ou uma entidade.

## Referência Externa

[drummerpva/erp](https://github.com/drummerpva/erp) é a arquitetura espelho
usada como referência prática — ver [[ADR-0008-arquitetura-de-referencia]].

---

*Última atualização: 2026-08-06*
