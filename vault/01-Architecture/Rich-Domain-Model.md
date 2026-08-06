---
title: Modelo de Domínio Rico (Anti Entidade Anêmica)
tags:
  - architecture
status: accepted
created: 2026-08-06
updated: 2026-08-06
---

# Modelo de Domínio Rico

> [!important] Regra do projeto
> Entidades **nunca** são um saco de getters/setters com a regra de negócio
> vivendo em outro lugar (caso de uso, service, repositório). Entidade
> encapsula seu próprio invariante e expõe **comportamento**, não campos soltos.

> [!note] Convenção de idioma
> O código do projeto é sempre em inglês (nomes de classe, método, variável,
> mensagem de erro) — só a documentação (este vault, comentários de PR) é em
> pt-BR. Ver [[02-Decisions/ADR-0009-idioma-codigo-vs-documentacao|ADR-0009]].
> Os exemplos abaixo refletem o código real de `packages/catalog`.

## O que é uma entidade anêmica (o que evitar)

```ts
// ❌ ANEMIC — the entity is just a data bag, the rule lives outside it
class Product {
  id: string
  status: string
  photos: Photo[]
  affiliateLink: string | null
}

// the business rule "cannot activate without an approved photo and a valid link"
// leaks into the use case — any other part of the code can build an active
// Product without this check, because nothing prevents it
class ApproveProductMedia {
  execute(input) {
    const product = this.repo.find(input.productId)
    if (product.photos.some(p => p.approved) && product.affiliateLink) {
      product.status = 'active' // direct mutation, no guard
    }
    this.repo.save(product)
  }
}
```

Sintomas de entidade anêmica: setters públicos em todo campo, regra de negócio
duplicada em mais de um caso de uso, dado inválido representável (um `Product`
"active" sem link é um estado que o TypeScript deixa você construir).

## O que é uma entidade rica (o padrão do projeto)

```ts
// ✅ RICH — the entity owns its own invariant
class Product {
  private constructor(
    private readonly id: ProductId,
    private name: string,
    private status: ProductStatus,
    private photos: Photo[],
    private affiliateLinkUrl: string | null,
  ) {}

  static createDraft(data: CreateProductData): Product {
    return new Product(ProductId.generate(), data.name, 'draft', [], null)
  }

  approvePhoto(url: string): void {
    const index = this.photos.findIndex((photo) => photo.getUrl() === url)
    this.photos[index] = this.photos[index].approve()
  }

  activate(): void {
    if (!this.hasApprovedPhoto()) {
      throw new DomainError('Product needs at least one approved photo to be activated')
    }
    if (!this.affiliateLinkUrl) {
      throw new DomainError('Product needs a valid affiliate link to be activated')
    }
    this.status = 'active'
  }

  deactivate(): void {
    this.status = 'inactive'
  }

  private hasApprovedPhoto(): boolean {
    return this.photos.some((photo) => photo.isApproved())
  }
}
```

O caso de uso fica fino — ele orquestra, não decide:

```ts
class ApproveProductMedia implements UseCase<Input, Output> {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: Input): Promise<Output> {
    const product = await this.productRepository.findById(input.productId)
    product.approvePhoto(input.photoUrl)
    if (input.tryActivate) product.activate() // may throw DomainError — the error mapper handles it at the edge
    await this.productRepository.save(product)
    return { productId: product.getId().toString() }
  }
}
```

Código completo e testado: [[03-Modules/Catalog|Módulo Catalog]] →
`packages/catalog/src/domain/Product.ts`.

## Regras práticas pra manter entidade rica

1. **Sem setter público de campo que participa de invariante.** Mudança de
   estado acontece por método nomeado no domínio (`activate()`, não `setStatus()`).
2. **Construtor privado + factory method nomeado** (`Product.createDraft(...)`)
   em vez de `new Product(...)` espalhado pelo código — o nome do factory já
   documenta em que estado a entidade nasce.
3. **Estado inválido deve ser irrepresentável quando possível.** Prefira
   `string | null` explícito a `string` solta que pode estar vazia/malformada.
4. **Toda invariante mencionada no domínio do módulo (ver
   [[03-Modules/_Index|nota do módulo]]) vira um `throw new DomainError`
   dentro da entidade**, não um `if` espalhado em caso de uso.
5. **Repositório nunca reconstrói entidade pulando o factory.** O adapter de
   persistência (`ProductRepositoryDatabase`) reidrata a entidade a partir da
   linha do banco chamando um método de reidratação dedicado (ex.:
   `Product.rehydrate(...)`), não `Object.assign`.

## Ver também

[[Use-Case-Pattern]] — como o caso de uso permanece fino quando a entidade é
rica · [[Error-Handling-Strategy]] — o que fazer com o `DomainError` lançado
pela entidade · [[03-Modules/Catalog|Módulo Catalog]] — onde essa entidade
`Product` de exemplo realmente vive
