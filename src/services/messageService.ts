import type { Message, SendMessageInput, ServiceResult } from '@/types'
import { getCollection, setCollection } from './mockStorage'
import { generateId } from '@/utils/helpers'
import { delay, ok } from './serviceHelpers'

/**
 * Message service.
 *
 * MOCK implementation backed by local storage. Maps conceptually to the
 * future backend endpoints: GET/POST /projects/:id/messages.
 */

/** Get all messages for a project. */
export async function getMessages(
  projectId: string
): Promise<ServiceResult<Message[]>> {
  await delay(200)
  const conversations = getCollection('conversations')
  const forProject = conversations.find((c) => c.projectId === projectId)
  return ok(forProject ? [...forProject.messages] : [])
}

/** Get a single conversation for a project (with message history). */
export async function getConversation(
  projectId: string
): Promise<ServiceResult<{ projectId: string; messages: Message[] } | null>> {
  await delay(200)
  const conversations = getCollection('conversations')
  const found = conversations.find((c) => c.projectId === projectId)
  if (!found) return ok(null)
  return ok({ projectId: found.projectId, messages: found.messages })
}

export async function sendMessage(
  input: SendMessageInput
): Promise<ServiceResult<Message>> {
  await delay(250)
  const conversations = getCollection('conversations')
  const existing = conversations.find(
    (c) => c.projectId === input.projectId
  )
  const message: Message = {
    id: generateId('msg'),
    projectId: input.projectId,
    senderId: input.senderId,
    body: input.body,
    createdAt: new Date().toISOString(),
  }

  if (existing) {
    const updated = conversations.map((c) =>
      c.projectId === input.projectId
        ? {
            ...c,
            lastMessageAt: message.createdAt,
            messages: [...c.messages, message],
          }
        : c
    )
    setCollection('conversations', updated)
  } else {
    // Create a new conversation for this project if none exists yet.
    setCollection('conversations', [
      ...conversations,
      {
        projectId: input.projectId,
        projectTitle: input.projectId,
        designerId: '',
        clientId: '',
        lastMessageAt: message.createdAt,
        messages: [message],
      },
    ])
  }
  return ok(message)
}

export async function deleteMessage(
  messageId: string,
  projectId: string
): Promise<ServiceResult<null>> {
  await delay(150)
  const conversations = getCollection('conversations')
  const updated = conversations.map((c) => {
    if (c.projectId !== projectId) return c
    return {
      ...c,
      messages: c.messages.map((m) =>
        m.id === messageId ? { ...m, deleted: true } : m
      ),
    }
  })
  setCollection('conversations', updated)
  return ok(null)
}
