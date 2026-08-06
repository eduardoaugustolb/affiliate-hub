import { DomainError } from '@affiliate-hub/shared-kernel'
import { Photo } from './Photo'
import { ProductId } from './ProductId'
import type { ProductStatus } from './ProductStatus'

export type Category = 'streetwear' | 'perfume'
export type MediaType = 'catalog' | 'lifestyle'

export interface ProductSnapshot {
  id: string
  name: string
  category: Category
  status: ProductStatus
  mediaType: MediaType | null
  assignedTemplate: string | null
  photos: Array<{ url: string; approved: boolean }>
  affiliateLinkUrl: string | null
  createdAt: Date
  updatedAt: Date
  removedAt: Date | null
}

export interface CreateProductData {
  name: string
  category: Category
}

export class Product {
  private constructor(
    private readonly id: ProductId,
    private name: string,
    private readonly category: Category,
    private status: ProductStatus,
    private mediaType: MediaType | null,
    private assignedTemplate: string | null,
    private photos: Photo[],
    private affiliateLinkUrl: string | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private removedAt: Date | null,
  ) {}

  static createDraft(data: CreateProductData): Product {
    const now = new Date()
    return new Product(
      ProductId.generate(),
      data.name,
      data.category,
      'draft',
      null,
      null,
      [],
      null,
      now,
      now,
      null,
    )
  }

  static rehydrate(snapshot: ProductSnapshot): Product {
    return new Product(
      ProductId.rehydrate(snapshot.id),
      snapshot.name,
      snapshot.category,
      snapshot.status,
      snapshot.mediaType,
      snapshot.assignedTemplate,
      snapshot.photos.map((photo) => Photo.rehydrate(photo.url, photo.approved)),
      snapshot.affiliateLinkUrl,
      snapshot.createdAt,
      snapshot.updatedAt,
      snapshot.removedAt,
    )
  }

  addPhoto(url: string): void {
    this.ensureNotRemoved()
    this.photos.push(Photo.create(url))
    this.touch()
  }

  approvePhoto(url: string): void {
    this.ensureNotRemoved()
    const index = this.photos.findIndex((photo) => photo.getUrl() === url)
    if (index === -1) {
      throw new DomainError(`Product has no photo with url ${url}`)
    }
    this.photos[index] = (this.photos[index] as Photo).approve()
    this.touch()
  }

  assignAffiliateLink(url: string): void {
    this.ensureNotRemoved()
    this.affiliateLinkUrl = url
    this.touch()
  }

  assignTemplate(templateId: string): void {
    this.ensureNotRemoved()
    this.assignedTemplate = templateId
    this.touch()
  }

  activate(): void {
    this.ensureNotRemoved()
    if (!this.hasApprovedPhoto()) {
      throw new DomainError('Product needs at least one approved photo to be activated')
    }
    if (!this.affiliateLinkUrl) {
      throw new DomainError('Product needs a valid affiliate link to be activated')
    }
    this.status = 'active'
    this.touch()
  }

  deactivate(): void {
    this.ensureNotRemoved()
    this.status = 'inactive'
    this.removedAt = new Date()
    this.touch()
  }

  toSnapshot(): ProductSnapshot {
    return {
      id: this.id.toString(),
      name: this.name,
      category: this.category,
      status: this.status,
      mediaType: this.mediaType,
      assignedTemplate: this.assignedTemplate,
      photos: this.photos.map((photo) => ({ url: photo.getUrl(), approved: photo.isApproved() })),
      affiliateLinkUrl: this.affiliateLinkUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      removedAt: this.removedAt,
    }
  }

  getId(): ProductId {
    return this.id
  }

  getStatus(): ProductStatus {
    return this.status
  }

  private hasApprovedPhoto(): boolean {
    return this.photos.some((photo) => photo.isApproved())
  }

  private ensureNotRemoved(): void {
    if (this.removedAt) {
      throw new DomainError('A removed product cannot be changed')
    }
  }

  private touch(): void {
    this.updatedAt = new Date()
  }
}
