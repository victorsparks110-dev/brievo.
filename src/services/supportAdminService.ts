import type { ServiceResult } from '@/types'
import { apiRequest } from './apiClient'

/**
 * Support admin service.
 *
 * Handles all admin/support API calls for ticket management.
 * Only accessible to users with the "support" role.
 */

interface SupportTicket {
  id: string
  userId: string | null
  type?: string
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

interface ListTicketsResponse {
  success: boolean
  tickets?: SupportTicket[]
}

interface TicketResponse {
  success: boolean
  message?: string
  ticket?: SupportTicket
  emailSent?: boolean
}

/** List all support tickets, optionally filtered by status. */
export async function listTickets(
  status?: string
): Promise<ServiceResult<SupportTicket[]>> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const result = await apiRequest<ListTicketsResponse>(
    `/api/support/admin/tickets${query}`,
    { method: 'GET', auth: true }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data.tickets ?? [] }
}

/** Get a single support ticket by ID. */
export async function getTicket(
  ticketId: string
): Promise<ServiceResult<SupportTicket>> {
  const result = await apiRequest<TicketResponse>(
    `/api/support/admin/tickets/${ticketId}`,
    { method: 'GET', auth: true }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  if (!result.data.ticket) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
    }
  }

  return { success: true, data: result.data.ticket }
}

/** Reply to a support ticket. */
export async function replyToTicket(
  ticketId: string,
  response: string
): Promise<ServiceResult<SupportTicket & { emailSent?: boolean }>> {
  const result = await apiRequest<TicketResponse>(
    `/api/support/admin/tickets/${ticketId}/reply`,
    { method: 'POST', body: { response }, auth: true }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  if (!result.data.ticket) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'No ticket data received.' },
    }
  }

  return {
    success: true,
    data: { ...result.data.ticket, emailSent: result.data.emailSent },
  }
}

/** Update a support ticket's status. */
export async function updateTicketStatus(
  ticketId: string,
  status: string
): Promise<ServiceResult<SupportTicket>> {
  const result = await apiRequest<TicketResponse>(
    `/api/support/admin/tickets/${ticketId}/status`,
    { method: 'PATCH', body: { status }, auth: true }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  if (!result.data.ticket) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'No ticket data received.' },
    }
  }

  return { success: true, data: result.data.ticket }
}

interface PendingDesigner {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}

interface PendingDesignersResponse {
  success: boolean
  designers?: PendingDesigner[]
}

interface ApproveDesignerResponse {
  success: boolean
  message?: string
  designer?: PendingDesigner
}

/** List all pending designers awaiting approval. */
export async function listPendingDesigners(): Promise<ServiceResult<PendingDesigner[]>> {
  const result = await apiRequest<PendingDesignersResponse>(
    '/api/support/admin/pending-designers',
    { method: 'GET', auth: true }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data.designers ?? [] }
}

/** Approve a pending designer account. */
export async function approveDesigner(
  designerId: string
): Promise<ServiceResult<PendingDesigner>> {
  const result = await apiRequest<ApproveDesignerResponse>(
    `/api/support/admin/pending-designers/${designerId}`,
    { method: 'POST', auth: true }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  if (!result.data.designer) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'No designer data received.' },
    }
  }

  return { success: true, data: result.data.designer }
}

// --- Password Reset Request Types ---

interface PasswordResetTicket {
  id: string
  userId: string | null
  type: string
  name: string
  email: string
  subject: string
  message: string
  status: string
  response: string | null
  resetLinkGeneratedAt: string | null
  hasResetLink: boolean
  repliedAt: string | null
  repliedBy: string | null
  emailSubject: string | null
  emailMessage: string | null
  createdAt: string
  updatedAt: string
}

interface PasswordResetTicketsResponse {
  success: boolean
  tickets?: PasswordResetTicket[]
}

interface PasswordResetTicketResponse {
  success: boolean
  message?: string
  ticket?: PasswordResetTicket
}

interface GenerateLinkResponse {
  success: boolean
  message?: string
  ticket?: PasswordResetTicket
  resetUrl?: string
}

/** List all password-reset support requests. */
export async function listPasswordResetRequests(
  status?: string
): Promise<ServiceResult<PasswordResetTicket[]>> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const result = await apiRequest<PasswordResetTicketsResponse>(
    `/api/support/admin/password-reset-requests${query}`,
    { method: 'GET', auth: true }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data.tickets ?? [] }
}

/** Get a single password-reset request by ID. */
export async function getPasswordResetRequest(
  ticketId: string
): Promise<ServiceResult<PasswordResetTicket>> {
  const result = await apiRequest<PasswordResetTicketResponse>(
    `/api/support/admin/password-reset-requests/${ticketId}`,
    { method: 'GET', auth: true }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  if (!result.data.ticket) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Password reset request not found.' },
    }
  }

  return { success: true, data: result.data.ticket }
}

/** Generate a password-reset link for a ticket. */
export async function generateResetLink(
  ticketId: string
): Promise<ServiceResult<{ ticket: PasswordResetTicket; resetUrl: string }>> {
  const result = await apiRequest<GenerateLinkResponse>(
    `/api/support/admin/password-reset-requests/${ticketId}/generate-link`,
    { method: 'POST', auth: true }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  if (!result.data.ticket || !result.data.resetUrl) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'No data received.' },
    }
  }

  return {
    success: true,
    data: { ticket: result.data.ticket, resetUrl: result.data.resetUrl },
  }
}

/** Send a password-reset email from the support dashboard. */
export async function sendPasswordResetEmail(
  ticketId: string,
  message: string,
  subject?: string
): Promise<ServiceResult<PasswordResetTicket>> {
  const result = await apiRequest<PasswordResetTicketResponse>(
    `/api/support/admin/password-reset-requests/${ticketId}/reply`,
    { method: 'POST', body: { message, subject }, auth: true }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  if (!result.data.ticket) {
    return {
      success: false,
      error: { code: 'UNKNOWN', message: 'No ticket data received.' },
    }
  }

  return { success: true, data: result.data.ticket }
}

export type { PasswordResetTicket }
