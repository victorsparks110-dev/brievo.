/**
 * Central brief model for BRIEVO.
 *
 * A brief is created by a designer and shared with a client through a
 * public link identified by a unique token. The client completes and
 * submits the brief, which can then be converted into a project.
 *
 * This model is intentionally independent of the UI.
 */

export type BriefStatus =
  | 'draft'
  | 'sent'
  | 'submitted'
  | 'reviewing'
  | 'converted'

/** Services a client can select on a brief. */
export type BriefService =
  | 'logo_design'
  | 'brand_identity'
  | 'social_media'
  | 'flyer_poster'
  | 'business_card'
  | 'packaging'
  | 'other'

/** Human-readable label for each service, used across the UI. */
export const BRIEF_SERVICE_LABELS: Record<BriefService, string> = {
  logo_design: 'Logo Design',
  brand_identity: 'Brand Identity',
  social_media: 'Social Media Design',
  flyer_poster: 'Flyer / Poster',
  business_card: 'Business Card',
  packaging: 'Packaging Design',
  other: 'Other Design',
}

/** Design categories a client can pick one of. */
export type DesignCategory =
  | 'new_brand'
  | 'rebrand'
  | 'new_product'
  | 'marketing'
  | 'event'
  | 'other'

export type BriefPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Brief {
  id: string
  designerId: string
  clientId?: string
  clientName: string
  clientEmail: string
  companyName: string
  title: string
  description: string
  selectedServices: BriefService[]
  deadline: string
  priority: BriefPriority
  designerInstructions: string
  status: BriefStatus
  /** Public, unauthenticated identifier used in /brief/:token. */
  uniqueToken: string
  createdAt: string
  updatedAt: string
}

/** Data used to create or update a brief. */
export interface BriefInput {
  clientName: string
  clientEmail: string
  companyName: string
  title: string
  description: string
  selectedServices: BriefService[]
  deadline: string
  priority: BriefPriority
  designerInstructions: string
}
