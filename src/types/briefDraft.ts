import type {
  BriefService,
} from '@/types'

/**
 * In-progress brief draft for the public client flow, persisted so a client
 * can move through the multi-step brief (intro → services → form → review)
 * without losing their selections. Backend-ready: submission is persisted
 * through the brief service; this only holds transient form state.
 */
export interface BriefDraft {
  briefId: string
  services: BriefService[]
  step: number
  businessInformation: string
  projectRequirements: string
  goals: string
  targetAudience: string
  designPreferences: string
  references: string
  additionalInformation: string
}
