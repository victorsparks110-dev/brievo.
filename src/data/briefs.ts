import type { Brief, BriefResponse } from '@/types'

/**
 * Mock briefs in various states. Each has a unique public token used for the
 * client access link at /brief/:token. `seed-brief-logo` is the demo brief a
 * client can open and complete to walk through the full workflow.
 */
export const mockBriefs: Brief[] = [
  {
    id: 'brief-1',
    designerId: 'user-designer-1',
    clientId: 'user-client-1',
    clientName: 'Maya Thompson',
    clientEmail: 'maya@brightbloom.com',
    companyName: 'Bright Bloom Studio',
    title: 'Logo Design & Brand Identity',
    description:
      'A complete visual identity for a boutique floral studio, starting with a fresh logo.',
    selectedServices: ['logo_design', 'brand_identity'],
    deadline: '2026-09-30T23:59:59.000Z',
    priority: 'high',
    designerInstructions:
      'Please share any existing brand colours, style references, and the mood you want to evoke.',
    status: 'sent',
    uniqueToken: 'seed-brief-logo',
    createdAt: '2026-08-25T09:00:00.000Z',
    updatedAt: '2026-08-25T09:00:00.000Z',
  },
  {
    id: 'brief-2',
    designerId: 'user-designer-1',
    clientId: 'user-client-2',
    clientName: 'David Okafor',
    clientEmail: 'david@nordica.co',
    companyName: 'Nordica Coffee',
    title: 'Social Media & Flyer Pack',
    description:
      'Seasonal launch assets for a coffee roastery: social templates and a launch flyer.',
    selectedServices: ['social_media', 'flyer_poster'],
    deadline: '2026-09-15T23:59:59.000Z',
    priority: 'medium',
    designerInstructions:
      'Fresh, minimal coffee branding with a retro-modern twist. Provide copy for the flyer.',
    status: 'submitted',
    uniqueToken: 'seed-brief-social',
    createdAt: '2026-08-10T09:00:00.000Z',
    updatedAt: '2026-08-26T14:00:00.000Z',
  },
  {
    id: 'brief-3',
    designerId: 'user-designer-1',
    clientId: 'user-client-3',
    clientName: 'Sofia Reyes',
    clientEmail: 'sofia@movementfitness.com',
    companyName: 'Movement Fitness',
    title: 'Business Card & Brand Refresh',
    description:
      'A modern business card refresh that matches an energetic gym identity.',
    selectedServices: ['business_card'],
    deadline: '2026-09-20T23:59:59.000Z',
    priority: 'low',
    designerInstructions: 'Keep the existing wordmark but modernize the card layout.',
    status: 'converted',
    uniqueToken: 'seed-brief-card',
    createdAt: '2026-08-05T09:00:00.000Z',
    updatedAt: '2026-08-27T09:00:00.000Z',
  },
]

/** Mock brief responses submitted by clients. */
export const mockBriefResponses: BriefResponse[] = [
  {
    id: 'response-2',
    briefId: 'brief-2',
    businessInformation:
      'Nordica is a small-batch coffee roaster founded in 2021. We focus on bold, single-origin blends and a warm, inviting brand.',
    projectRequirements:
      'A set of social media templates for Instagram and a one-page A5 launch flyer for our autumn blend.',
    goals:
      'Increase seasonal campaign visibility and make our social feed look cohesive and premium.',
    targetAudience:
      'Coffee enthusiasts aged 25–45 who value craft, quality, and design.',
    designPreferences:
      'Retro-modern, minimal, with terracotta and cream tones. Bold typography.',
    references: 'We love the work of several independent roasters; see uploaded references.',
    additionalInformation: 'Deadline is tight before the autumn launch event.',
    submittedAt: '2026-08-26T14:00:00.000Z',
  },
]
