---
title: "Hexagonal: Ports & Adapters"
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Arquitetura Hexagonal (Ports & Adapters)

Todo acesso a algo externo ao domínio (banco, HTTP, fila, storage, SDK de
terceiro, até o relógio do sistema) passa por uma **porta**: uma interface
declarada pela camada de aplicação, nomeada em termos de domínio.

## Regra de nomenclatura de porta

Porta nunca carrega nome de tecnologia. `AffiliateProvider`, não `ShopeeClient`.
`DatabaseConnection`, não `PostgresClient`. `MessagingClient`, não
`BaileysClient`. O nome da porta precisa continuar fazendo sentido mesmo
depois de trocar o adapter por baixo.

## Exemplo concreto do domínio deste projeto

```
AffiliateProvider (porta, declarada por Application)
  └── ShopeeAffiliateProvider implements AffiliateProvider  (adapter hoje)
  └── SheinAffiliateProvider implements AffiliateProvider   (adapter futuro, se necessário)
```

Nenhum caso de uso muda quando `SheinAffiliateProvider` é adicionado, só o
composition root passa a escolher qual adapter injetar (ou injeta os dois, se
o caso de uso for desenhado pra lidar com múltiplas fontes).

## Entrada também é porta

Quem define o contrato de entrada (rota HTTP, mensagem de fila, comando de
cron) é a própria camada que expõe aquele caso de uso, e essa camada declara
a porta de transporte (`HttpServer`, `QueueConsumer`, `TaskScheduler`) que
os adapters de framework implementam. O caso de uso não sabe se foi chamado
por uma rota REST, um worker de fila ou um comando de terminal.

## Toda porta precisa de adapter fake

Critério de aceite (ver [[08-DoD/Definition-of-Done]]): toda porta tem pelo
menos um adapter fake/in-memory usado em teste de caso de uso, provando que a
aplicação não depende de infraestrutura real pra ser testada.

## Matriz completa deste projeto

Ver [[04-Infrastructure/Ports-Adapters-Matrix|Matriz de Portas ↔ Adapters]]
pra lista de toda porta declarada em cada módulo e seu(s) adapter(s).

## Ver também

[[Dependency-Rule]] · [[Repository-Pattern]] (caso especial de porta) ·
[[03-Modules/_Index|Módulos]]
