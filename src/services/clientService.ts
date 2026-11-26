import type { Client, ClientInput, ServiceResult } from '@/types'
import { getCollection, upsertInCollection } from './mockStorage'
import { generateId } from '@/utils/helpers'
import { delay, fail, notFound, ok } from './serviceHelpers'

/**
 * Client service.
 *
 * MOCK implementation backed by local storage. Maps conceptually to the
 * future backend endpoints: GET/POST /clients, GET/PATCH /clients/:id.
 */

export async function getClients(
  designerId?: string
): Promise<ServiceResult<Client[]>> {
  await delay(200)
  let clients = getCollection('clients')
  if (designerId) {
    clients = clients.filter((c) => c.designerId === designerId)
  }
  return ok([...clients].sort((a, b) => a.name.localeCompare(b.name)))
}

export async function getClient(id: string): Promise<ServiceResult<Client>> {
  await delay(150)
  const client = getCollection('clients').find((c) => c.id === id)
  if (!client) return fail(notFound('Client'))
  return ok(client)
}

export async function createClient(
  designerId: string,
  input: ClientInput
): Promise<ServiceResult<Client>> {
  await delay()
  const now = new Date().toISOString()
  const client: Client = {
    id: generateId('client'),
    designerId,
    name: input.name,
    email: input.email,
    companyName: input.companyName,
    phone: input.phone,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }
  upsertInCollection('clients', client)
  return ok(client)
}

export async function updateClient(
  id: string,
  updates: Partial<ClientInput>
): Promise<ServiceResult<Client>> {
  await delay()
  const clients = getCollection('clients')
  const client = clients.find((c) => c.id === id)
  if (!client) return fail(notFound('Client'))
  const updated: Client = {
    ...client,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  upsertInCollection('clients', updated)
  return ok(updated)
}
