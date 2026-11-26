/**
 * Central project model for BRIEVO.
 *
 * A project is created from a submitted brief and tracks the designer–client
 * collaboration through the full workflow.
 */

export type ProjectStatus =
  | 'new_brief'
  | 'brief_review'
  | 'in_progress'
  | 'awaiting_feedback'
  | 'revision_requested'
  | 'final_review'
  | 'approved'
  | 'completed'
  | 'cancelled'

/** Human-readable label and badge tone for each project status. */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  new_brief: 'New Brief',
  brief_review: 'Brief Review',
  in_progress: 'In Progress',
  awaiting_feedback: 'Awaiting Client Feedback',
  revision_requested: 'Revision Requested',
  final_review: 'Final Review',
  approved: 'Approved',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export interface Project {
  id: string
  briefId: string
  designerId: string
  clientId: string
  title: string
  status: ProjectStatus
  deadline: string
  createdAt: string
  updatedAt: string
  /** Current version/draft number, incremented on each designer submission. */
  currentRevision: number
}

/** A single entry in a project's activity history/timeline. */
export type ActivityType =
  | 'brief_submitted'
  | 'brief_reviewed'
  | 'status_changed'
  | 'design_submitted'
  | 'feedback_sent'
  | 'revision_requested'
  | 'message'
  | 'file_uploaded'
  | 'approved'
  | 'completed'

export interface ProjectActivity {
  id: string
  projectId: string
  type: ActivityType
  /** Summary line shown in the timeline. */
  title: string
  /** Optional longer description. */
  detail?: string
  actorId?: string
  createdAt: string
}

/** Used to create a project from a submitted brief. */
export interface CreateProjectInput {
  briefId: string
  designerId: string
  clientId: string
  title: string
  deadline: string
}
