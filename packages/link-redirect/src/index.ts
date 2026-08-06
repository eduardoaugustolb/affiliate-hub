export type { ClickLog, ClickRecord } from './application/ports/ClickLog'
export { RedirectToAffiliateLink } from './application/use-cases/RedirectToAffiliateLink'
export type {
  RedirectToAffiliateLinkInput,
  RedirectToAffiliateLinkOutput,
} from './application/use-cases/RedirectToAffiliateLink'
export { RegisterClick } from './application/use-cases/RegisterClick'
export type { RegisterClickInput, RegisterClickOutput } from './application/use-cases/RegisterClick'
export { ClickLogDatabase } from './adapters/ClickLogDatabase'
