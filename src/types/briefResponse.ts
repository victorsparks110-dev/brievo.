/**
 * Information submitted by a client in response to a brief.
 *
 * Kept as a separate model from the brief itself so the brief stays
 * designer-authored and the response stays client-authored.
 */

export interface BriefResponse {
  id: string
  briefId: string
  businessInformation: string
  projectRequirements: string
  goals: string
  targetAudience: string
  designPreferences: string
  references: string
  additionalInformation: string
  submittedAt: string
}
