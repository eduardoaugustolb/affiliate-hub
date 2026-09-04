---
title: Padrão de Repositório
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Padrão de Repositório

Portas de persistência são definidas em termos de domínio (`ProductRepository`,
não `ProductTable`). O repositório trabalha com **entidades**, nunca com linha
de banco crua.

## O repositório não conhece o banco

O adapter concreto (`ProductRepositorySql`) **não conhece qual banco está
por trás**, ele recebe a porta `DatabaseConnection` injetada no construtor e
só sabe montar SQL e chamar `query`. Quem conhece Postgres/MySQL/SQLite é
exclusivamente o adapter da própria porta `DatabaseConnection`
(`PgAdapter`, `MysqlAdapter`, `SQLiteAdapter`).

```
ProductRepository (porta de domínio)
  └── ProductRepositorySql implements ProductRepository
        constructor(private readonly db: DatabaseConnection) {}
        // usa this.db.query(...), nunca importa 'pg' ou 'postgres.js' diretamente

DatabaseConnection (porta de infra)
  └── PgAdapter implements DatabaseConnection      (hoje)
  └── MysqlAdapter implements DatabaseConnection   (troca isolada, se precisar)
  └── SQLiteAdapter implements DatabaseConnection  (útil em teste de integração local)
```

Trocar de banco é trocar o adapter de `DatabaseConnection` no composition
root, o repositório e todo caso de uso ficam intocados. Ver
[[02-Decisions/ADR-0002-database-connection-sem-orm|ADR-0002]].

## Reidratação de entidade

O repositório nunca reconstrói uma entidade rica pulando as regras dela:
usa um método de reidratação dedicado da própria entidade (ex.:
`Product.rehydrate(row)`), não `Object.assign` ou cast direto.
Ver [[Rich-Domain-Model]].

## Sem ORM

Sem query builder/ORM entre o repositório e o banco. SQL é escrito
explicitamente dentro do adapter `<Entity>RepositorySql`. Migration é
outra responsabilidade, cuidada por Knex, ver
[[02-Decisions/ADR-0006-knex-apenas-para-migrations|ADR-0006]].

## Ver também

[[Hexagonal-Ports-and-Adapters]] · [[04-Infrastructure/Ports-Adapters-Matrix]]
