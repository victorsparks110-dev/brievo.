/**
 * Central notification model for BRIEVO.
 *
 * Mock/local notifications in the frontend-only phase; later replaced by
 * backend notifications.
 */

export type NotificationType =
  | 'brief'
  | 'message'
  | 'feedback'
  | 'revision'
  | 'project'
  | 'system'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  /** Optional deep link to navigate to on click. */
  link?: string
  read: boolean
  createdAt: string
}

/** Used to create a new notification. */
export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string
}
