import type {
  AppNotification,
  CreateNotificationInput,
  ServiceResult,
} from '@/types'
import { getCollection, setCollection, upsertInCollection } from './mockStorage'
import { generateId } from '@/utils/helpers'
import { delay, fail, notFound, ok } from './serviceHelpers'

/**
 * Notification service.
 *
 * MOCK implementation backed by local storage. Maps conceptually to a future
 * backend notifications endpoint.
 */

export async function getNotifications(
  userId: string
): Promise<ServiceResult<AppNotification[]>> {
  await delay(200)
  const notifications = getCollection('notifications')
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return ok(notifications)
}

export async function markAsRead(
  notificationId: string
): Promise<ServiceResult<AppNotification>> {
  await delay(100)
  const notifications = getCollection('notifications')
  const found = notifications.find((n) => n.id === notificationId)
  if (!found) return fail(notFound('Notification'))
  const updated = { ...found, read: true }
  upsertInCollection('notifications', updated)
  return ok(updated)
}

export async function markAllAsRead(
  userId: string
): Promise<ServiceResult<null>> {
  await delay(200)
  const notifications = getCollection('notifications').map((n) =>
    n.userId === userId ? { ...n, read: true } : n
  )
  setCollection('notifications', notifications)
  return ok(null)
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<ServiceResult<AppNotification>> {
  await delay(100)
  const notification: AppNotification = {
    id: generateId('n'),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    read: false,
    createdAt: new Date().toISOString(),
  }
  upsertInCollection('notifications', notification)
  return ok(notification)
}
