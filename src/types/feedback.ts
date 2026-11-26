/**
 * Central feedback model for BRIEVO.
 *
 * Feedback is submitted by a client against a project draft/version and
 * supports the revision workflow. Kept separate from revisions: a piece of
 * feedback describes what needs to change, a revision is the request to
 * change it.
 */

export type FeedbackType = 'general' | 'changes' | 'approval'

export interface Feedback {
  id: string
  projectId: string
  authorId: string
  /** The draft/version this feedback refers to. */
  revisionNumber: number
  type: FeedbackType
  content: string
  createdAt: string
  /** Whether the designer has acknowledged this feedback. */
  read: boolean
}

/** Used to submit new feedback. */
export interface FeedbackInput {
  projectId: string
  authorId: string
  revisionNumber: number
  type: FeedbackType
  content: string
}
