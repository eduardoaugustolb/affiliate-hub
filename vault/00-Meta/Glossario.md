---
title: Glossário
tags:
  - meta
status: living
created: 2026-08-06
updated: 2026-08-06
---

# Glossário

## Termos Arquiteturais

**Porta (Port)**
: Interface declarada pela camada de aplicação, expressando uma necessidade em
  termos de domínio (`ProductRepository`, `HttpClient`), nunca em termos de
  tecnologia (`PgClient`, `AxiosInstance`). Ver [[Hexagonal-Ports-and-Adapters]].

**Adapter**
: Implementação concreta de uma porta, ligada a uma tecnologia específica
  (`PgAdapter implements DatabaseConnection`). Descartável e substituível por
  definição: se não for, a porta está mal desenhada.

**Composition Root**
: Único ponto do sistema (`main.ts` de cada serviço deployável) onde adapters
  concretos são instanciados e injetados nos casos de uso. Nenhum outro lugar
  do código pode fazer `new PgAdapter()` ou equivalente.

**Caso de Uso (Use Case)**
: Orquestração de uma operação de negócio, implementando `UseCase<Input, Output>`.
  Depende só de portas. Ver [[Use-Case-Pattern]].

**Entidade Rica vs. Entidade Anêmica**
: Entidade rica encapsula invariante e comportamento (`product.activate()` que
  valida internamente). Entidade anêmica é só um saco de getters/setters,
  com a regra de negócio vazada pro caso de uso. Ver [[Rich-Domain-Model]].

**Value Object**
: Tipo imutável definido pelo seu valor, não por identidade (`ProductId`).
  Se dois VOs têm os mesmos valores, são iguais.

**Bounded Context**
: Fronteira de domínio dentro da qual um modelo e sua linguagem ubíqua são
  consistentes. Ver [[03-Modules/_Index|Módulos]].

**Regra de Dependência**
: Dependência de código só aponta pra dentro: Adapters → Application → Domain.
  Nunca o contrário. Ver [[Dependency-Rule]].

**DomainError / ApplicationError**
: Erros tipados da camada de negócio, distintos de exceção de infraestrutura
  (timeout de rede, erro de driver). Ver [[Error-Handling-Strategy]].

## Termos de Produto (domínio "Drops do Frost")

**Identificador de Produto**
: Código curto tipo `BBA-QES-MZN`, gerado uma vez, imutável, chave usada no
  link curto, no QR code e no overlay da imagem de post.

**Photo Dump**
: Formato de post com múltiplas fotos em grade/colagem, comum no nicho
  streetwear/perfume no Instagram/TikTok.

**SubId**
: Identificador de sub-afiliado usado pela Shopee Affiliate API pra rastrear
  origem de clique/conversão por canal.

**Kill Switch**
: Mecanismo operacional pra pausar uma automação (ex.: `PauseBroadcast`) sem
  precisar de deploy, usado como mitigação de risco.
