---
title: Visão Geral das Camadas
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Visão Geral das Camadas

| Camada | Responsabilidade | Conhece |
|---|---|---|
| **Domain** | Entidades ricas, regras de negócio invariantes, value objects | Nada externo |
| **Application** | Casos de uso (orquestração), portas (interfaces) | Domain + suas próprias portas |
| **Adapters** | Implementações concretas das portas (banco, HTTP, filas, SDKs) | Application (via porta) + biblioteca externa |
| **Main (composition root)** | Instancia adapters concretos, injeta nos casos de uso, faz o "fiação" da aplicação | Tudo: é a única camada que pode conhecer implementações concretas |

## Por que nessa ordem

Cada camada só pode importar de camadas mais internas (Domain é o centro).
Isso é a [[Dependency-Rule]] aplicada. `Adapters` implementa interfaces que
`Application` declara, a seta de dependência do código roda contrário à seta
de dependência de runtime (Adapters chama Application, mas quem *declara* o
contrato é Application). Esse é o "princípio de inversão de dependência" na prática.

## Erro comum a evitar

Colocar lógica de negócio dentro de um adapter (ex.: `ProductRepositoryDatabase`
decidindo se um produto pode ser ativado), isso vaza regra de domínio pra
camada errada. Regra de negócio mora em [[Rich-Domain-Model|entidade ou caso de uso]],
nunca em adapter.

## Ver também

[[Hexagonal-Ports-and-Adapters]] · [[Use-Case-Pattern]] · [[Repository-Pattern]]
