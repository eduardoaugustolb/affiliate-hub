---
title: Padrão de Caso de Uso
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Padrão de Caso de Uso

Todo caso de uso implementa uma interface genérica `UseCase<Input, Output>`,
com `Input`/`Output` tipados junto ao próprio caso de uso (não em arquivo de
tipos solto).

```ts
interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>
}
```

## Regras

- Casos de uso dependem de **portas**, nunca de adapters concretos, a porta é
  declarada pela camada de aplicação, e o adapter concreto é injetado de fora
  (composition root), nunca instanciado dentro do caso de uso.
- Caso de uso **orquestra**, não decide regra de negócio, a decisão mora na
  entidade (ver [[Rich-Domain-Model]]). Se um caso de uso tem mais de um `if`
  checando invariante de domínio, é sinal de que essa regra deveria estar na
  entidade.
- Um caso de uso, um arquivo, um nome de verbo+substantivo
  (`RegisterProduct`, não `ProductService`).

## Exemplo mínimo

```ts
class DeactivateProduct implements UseCase<DesativarProdutoInput, DesativarProdutoOutput> {
  constructor(
    private readonly repo: ProductRepository,
    private readonly eventos: EventPublisher,
  ) {}

  async execute(input: DesativarProdutoInput): Promise<DesativarProdutoOutput> {
    const product = await this.repo.findById(input.productId)
    product.deactivate() // regra de domínio, dentro da entidade
    await this.repo.save(product)
    await this.eventos.publicar(new ProductDeactivated(product.id))
    return { productId: product.id }
  }
}
```

## Teste de caso de uso

Testado com adapter fake/in-memory de cada porta (`ProductRepositoryFake`,
`EventPublisherFake`), nunca contra banco/rede real. Critério de aceite
completo em [[08-DoD/Definition-of-Done]].

## Ver também

[[Rich-Domain-Model]] · [[Repository-Pattern]] · [[Error-Handling-Strategy]]
