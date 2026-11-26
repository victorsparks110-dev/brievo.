import type { ContactMessage, ContactMessageInput, ServiceResult } from '@/types'
import { apiRequest } from './apiClient'

/**
 * Contact message service.
 *
 * Submits support requests to the BRIEVO backend via POST /api/support.
 * The backend stores tickets in MongoDB and returns the created record.
 *
 * The UI layer (DesignerContactPage) imports this module and never touches
 * HTTP directly — so the implementation details are hidden from the form.
 */

interface BackendTicketResponse {
  success: boolean
  message?: string
  ticket?: {
    id: string
    userId: string | null
    name: string
    email: string
    phone?: string
    subject: string
    message: string
    status: string
    response: string | null
    createdAt: string
    updatedAt: string
  }
}

interface BackendTicketsListResponse {
  success: boolean
  tickets?: Array<{
    id: string
    userId: string | null
    name: string
    email: string
    phone?: string
    subject: string
    message: string
    status: string
    response: string | null
    createdAt: string
    updatedAt: string
  }>
}

/**
 * Submit a contact/support message.
 *
 * Sends the form data to POST /api/support. If the user is authenticated
 * (userId is present), the bearer token is attached so the backend can
 * associate the ticket with the user's account.
 *
 * @param input - Validated form data from the Contact Us page.
 * @returns The created ContactMessage record from the backend.
 */
export async function submitMessage(
  input: ContactMessageInput
): Promise<ServiceResult<ContactMessage>> {
  const result = await apiRequest<BackendTicketResponse>('/api/support', {
    method: 'POST',
    body: {
      name: input.name,
      email: input.email,
      phone: input.phone || undefined,
      subject: input.subject,
      message: input.message,
    },
    auth: !!input.userId,
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const ticket = result.data.ticket
  if (!ticket) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'No ticket data received from the server.' },
    }
  }

  // Map backend ticket to the existing frontend ContactMessage type.
  const message: ContactMessage = {
    id: ticket.id,
    userId: ticket.userId ?? undefined,
    name: ticket.name,
    email: ticket.email,
    phone: ticket.phone || undefined,
    subject: ticket.subject,
    message: ticket.message,
    createdAt: ticket.createdAt,
    status: ticket.status as ContactMessage['status'],
  }

  return { success: true, data: message }
}

/**
 * Retrieve all support tickets submitted by the authenticated user.
 *
 * Requires a valid bearer token — the backend only returns tickets
 * belonging to the caller.
 *
 * @param _userId - Not used directly; the backend identifies the user from the token.
 * @returns Array of ContactMessage records.
 */
export async function getMessagesByUser(
  _userId: string
): Promise<ServiceResult<ContactMessage[]>> {
  const result = await apiRequest<BackendTicketsListResponse>('/api/support/my-tickets', {
    method: 'GET',
    auth: true,
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const tickets = result.data.tickets ?? []
  const messages: ContactMessage[] = tickets.map((t) => ({
    id: t.id,
    userId: t.userId ?? undefined,
    name: t.name,
    email: t.email,
    phone: t.phone || undefined,
    subject: t.subject,
    message: t.message,
    response: t.response,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    status: t.status as ContactMessage['status'],
  }))

  return { success: true, data: messages }
}

/**
 * Retrieve a single support ticket by ID, scoped to the authenticated user.
 *
 * Requires a valid bearer token — the backend only returns the ticket
 * if it belongs to the caller.
 *
 * @param ticketId - The ticket's ID.
 * @returns The ContactMessage record, or an error if not found/not owned.
 */
export async function getTicketById(
  ticketId: string
): Promise<ServiceResult<ContactMessage>> {
  const result = await apiRequest<BackendTicketResponse>(`/api/support/my-tickets/${ticketId}`, {
    method: 'GET',
    auth: true,
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const ticket = result.data.ticket
  if (!ticket) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'No ticket data received from the server.' },
    }
  }

  const message: ContactMessage = {
    id: ticket.id,
    userId: ticket.userId ?? undefined,
    name: ticket.name,
    email: ticket.email,
    phone: ticket.phone || undefined,
    subject: ticket.subject,
    message: ticket.message,
    response: ticket.response,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    status: ticket.status as ContactMessage['status'],
  }

  return { success: true, data: message }
}

/** Retrieve ticket status by public tracking token (no auth required). */
export async function getPublicTicketStatus(
  trackingToken: string
): Promise<ServiceResult<{ status: string }>> {
  const result = await apiRequest<{ status: string }>(
    `/api/support/public-status/${trackingToken}`,
    {
      method: 'GET',
      auth: false,
    }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data }
}
