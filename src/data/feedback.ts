import type { Feedback, Revision } from '@/types'

/** Mock feedback submitted by clients against project drafts. */
export const mockFeedback: Feedback[] = [
  {
    id: 'fb-1',
    projectId: 'project-1',
    authorId: 'user-client-1',
    revisionNumber: 1,
    type: 'changes',
    content:
      'Love the primary mark. Could we see a version with a lighter line weight, and maybe a secondary mark for small sizes?',
    createdAt: '2026-08-29T09:00:00.000Z',
    read: true,
  },
  {
    id: 'fb-2',
    projectId: 'project-2',
    authorId: 'user-client-2',
    revisionNumber: 1,
    type: 'changes',
    content:
      'Please warm up the autumn tone (more cream) and make the flyer headline a touch larger.',
    createdAt: '2026-08-29T10:00:00.000Z',
    read: false,
  },
]

/** Mock revision requests. */
export const mockRevisions: Revision[] = [
  {
    id: 'rev-1',
    projectId: 'project-2',
    revisionNumber: 2,
    requestedById: 'user-client-2',
    notes:
      'Adjust the colour warmth and increase headline size on the flyer. Everything else is good.',
    status: 'in_progress',
    createdAt: '2026-08-29T10:10:00.000Z',
    updatedAt: '2026-08-29T10:10:00.000Z',
  },
  {
    id: 'rev-2',
    projectId: 'project-1',
    revisionNumber: 2,
    requestedById: 'user-client-1',
    notes: 'Provide a lighter-weight and secondary mark as discussed in feedback.',
    status: 'requested',
    createdAt: '2026-08-29T09:10:00.000Z',
    updatedAt: '2026-08-29T09:10:00.000Z',
  },
]
