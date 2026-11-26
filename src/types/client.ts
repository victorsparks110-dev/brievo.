/**
 * Central client model for BRIEVO.
 *
 * Represents an external client an authoring designer works with. A client
 * account may or may not exist yet — a brief can reference a client before
 * they sign up.
 */

export interface Client {
  id: string
  designerId: string
  name: string
  email: string
  companyName: string
  phone?: string
  notes?: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

/** Used to create or update a client. */
export interface ClientInput {
  name: string
  email: string
  companyName: string
  phone?: string
  notes?: string
}
