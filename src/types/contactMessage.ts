/**
 * Contact Message model for BRIEVO.
 *
 * Represents a support/enquiry message submitted by a logged-in designer
 * through the Contact Us feature.
 *
 * The data structure is intentionally backend-ready:
 *   - `id`, `userId`, `createdAt` mirror what a real DB row would have.
 *   - `status` allows admin workflow (new → read → resolved).
 *
 * When the backend is implemented, replace the contactService storage layer
 * with API calls (POST /api/contact-messages). This type stays unchanged.
 */

export type ContactMessageStatus = 'new' | 'in_progress' | 'answered' | 'resolved'

export interface ContactMessage {
  id: string
  /** ID of the authenticated designer who submitted the message, when available. */
  userId?: string
  name: string
  email: string
  /** Optional — taken from the user's saved profile phone if available. */
  phone?: string
  subject: string
  message: string
  /** Support team's reply, if any. */
  response?: string | null
  /** ISO-8601 timestamp of submission. */
  createdAt: string
  /** ISO-8601 timestamp of last update. */
  updatedAt?: string
  /**
   * Workflow status for admin dashboard.
   * All messages start as 'new'.
   */
  status: ContactMessageStatus
}

/** Payload the UI sends to contactService.submitMessage(). */
export interface ContactMessageInput {
  /** Optional — present for logged-in designers, absent for public visitors. */
  userId?: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
}
