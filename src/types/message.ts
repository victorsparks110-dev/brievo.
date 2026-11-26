/**
 * Central message model for BRIEVO.
 *
 * Messages are scoped to a project and exchanged between a designer and
 * client. Kept storage-agnostic so a future backend can power the same UI.
 */

export interface Message {
  id: string
  projectId: string
  senderId: string
  body: string
  createdAt: string
  /** Set when the sender or an admin deletes a message. */
  deleted?: boolean
}

/** A grouping of messages belonging to a single project conversation. */
export interface Conversation {
  projectId: string
  projectTitle: string
  designerId: string
  clientId: string
  lastMessageAt: string
  messages: Message[]
}

/** Used to send a new message. */
export interface SendMessageInput {
  projectId: string
  senderId: string
  body: string
}
