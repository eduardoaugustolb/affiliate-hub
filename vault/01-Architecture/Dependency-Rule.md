---
title: Regra de Dependência
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Regra de Dependência

> [!important]
> **A regra de dependência aponta sempre para dentro.**
> Domínio não conhece caso de uso. Caso de uso não conhece framework, banco,
> fila ou biblioteca externa — ele só conhece **portas** (interfaces) que ele
> mesmo declara. Frameworks, bancos, filas e SDKs de terceiros são **adapters**
> — implementações descartáveis e substituíveis dessas portas.

## Sinal de que a regra está sendo seguida

Trocar Fastify por Express, ou MySQL por Postgres, ou Baileys por outra lib de
WhatsApp deve significar trocar **uma linha no composition root** — nunca
editar um caso de uso ou uma entidade de domínio.

## Sinal de que a regra foi violada

- Um caso de uso importa um pacote npm de infraestrutura diretamente
  (`import { Client } from 'pg'` dentro de um `UseCase`).
- Uma entidade de domínio importa algo de fora do domínio (mesmo que seja só
  um tipo).
- Um teste de caso de uso exige banco/rede real pra rodar — ver critério em
  [[08-DoD/Definition-of-Done]].
- Um adapter toma decisão de negócio (`if (product.fotos.length === 0) throw`
  dentro de um `ProductRepositoryDatabase`, em vez de dentro da entidade).

## Como isso se relaciona com o resto

- [[Layers-Overview]] formaliza quem pode importar quem.
- [[Hexagonal-Ports-and-Adapters]] é o mecanismo (porta + adapter) que torna a
  regra possível de cumprir na prática.
- [[Rich-Domain-Model]] é a razão pela qual regra de negócio não vaza pra fora
  do domínio: ela mora dentro da entidade, que não depende de nada externo.
