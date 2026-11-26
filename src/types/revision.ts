/**
 * Central revision model for BRIEVO.
 *
 * A revision request is created by a client to ask the designer to rework a
 * draft. Kept separate from the project itself so the workflow is explicit
 * and backend-ready.
 */

export type RevisionStatus = 'requested' | 'in_progress' | 'completed' | 'approved'

export interface Revision {
  id: string
  projectId: string
  /** The version this revision applies to / targets. */
  revisionNumber: number
  requestedById: string
  notes: string
  status: RevisionStatus
  createdAt: string
  updatedAt: string
}

/** Used to create a new revision request. */
export interface RevisionInput {
  projectId: string
  revisionNumber: number
  requestedById: string
  notes: string
}
