import type {
  AppNotification,
  Brief,
  BriefResponse,
  Client,
  ContactMessage,
  Conversation,
  Feedback,
  FormDefinition,
  FormResponse,
  Project,
  ProjectActivity,
  ProjectFile,
  Revision,
} from '@/types'
import { mockUsers, type MockUser } from '@/data/users'
import { mockClientsProfiles } from '@/data/clients'
import { mockBriefs, mockBriefResponses } from '@/data/briefs'
import { mockProjects } from '@/data/projects'
import { mockActivities } from '@/data/activities'
import { mockConversations } from '@/data/messages'
import { mockFiles } from '@/data/files'
import { mockFeedback, mockRevisions } from '@/data/feedback'
import { mockNotifications } from '@/data/notifications'
import { mockForms, mockFormResponses } from '@/data/forms'

/**
 * Data access layer (mock implementation).
 *
 * This is the ONLY module that reads/writes localStorage. Services depend on
 * the functions here instead of touching storage directly, so the storage
 * backend can be swapped for a real API later.
 *
 * When a backend is added, replace the bodies of these functions with API
 * calls — the rest of the application is unaffected.
 */

const KEYS = {
  seeded: 'brievo:seeded',
  users: 'brievo:users',
  clients: 'brievo:clients',
  briefs: 'brievo:briefs',
  briefResponses: 'brievo:briefResponses',
  projects: 'brievo:projects',
  activities: 'brievo:activities',
  conversations: 'brievo:conversations',
  files: 'brievo:files',
  feedback: 'brievo:feedback',
  revisions: 'brievo:revisions',
  notifications: 'brievo:notifications',
  forms: 'brievo:forms',
  formResponses: 'brievo:formResponses',
  session: 'brievo:session',
} as const

const STORAGE_KEY = '__IN_MEMORY__'

interface StorageShape {
  users: MockUser[]
  clients: Client[]
  briefs: Brief[]
  briefResponses: BriefResponse[]
  projects: Project[]
  activities: ProjectActivity[]
  conversations: Conversation[]
  files: ProjectFile[]
  feedback: Feedback[]
  revisions: Revision[]
  notifications: AppNotification[]
  forms: FormDefinition[]
  formResponses: FormResponse[]
  contactMessages: ContactMessage[]
}

/**
 * In-memory fallback store used when localStorage is unavailable (SSR/test).
 * Persisted values live in localStorage; this isolates access behind one API.
 */
const memoryStore: StorageShape = {
  users: [],
  clients: [],
  briefs: [],
  briefResponses: [],
  projects: [],
  activities: [],
  conversations: [],
  files: [],
  feedback: [],
  revisions: [],
  notifications: [],
  forms: [],
  formResponses: [],
  contactMessages: [],
}

function canUseStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function readStore(): StorageShape {
  if (!canUseStorage()) {
    return memoryStore
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return memoryStore
    return { ...memoryStore, ...JSON.parse(raw) } as StorageShape
  } catch {
    return memoryStore
  }
}

function writeStore(store: StorageShape): void {
  if (!canUseStorage()) {
    Object.assign(memoryStore, store)
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    Object.assign(memoryStore, store)
  } catch {
    Object.assign(memoryStore, store)
  }
}

/** Seed mock data into storage once (idempotent). */
export function seedDatabase(): void {
  if (canUseStorage() && window.localStorage.getItem(KEYS.seeded) === 'true') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const store = raw ? JSON.parse(raw) as Partial<StorageShape> : {}
      const forms = Array.isArray(store.forms)
        ? store.forms.map((form) => {
            const seededForm = mockForms.find((entry) => entry.id === form.id)
            if (seededForm && (!form.fields || form.fields.length < 10)) {
              return seededForm
            }
            return form
          })
        : mockForms
      const formResponses = Array.isArray(store.formResponses)
        ? store.formResponses.map((response) => {
            const seededResponse = mockFormResponses.find((entry) => entry.id === response.id)
            return {
              ...response,
              answers: { ...(seededResponse?.answers ?? {}), ...(response.answers ?? {}) },
              projectInformation: {
                ...(seededResponse?.projectInformation ?? {}),
                ...(response.projectInformation ?? {}),
              },
            }
          })
        : mockFormResponses
      writeStore({
        ...readStore(),
        forms,
        formResponses,
      })
    } catch {
      writeStore({ ...readStore(), forms: mockForms, formResponses: mockFormResponses })
    }
    return
  }
  const store: StorageShape = {
    users: mockUsers,
    clients: mockClientsProfiles,
    briefs: mockBriefs,
    briefResponses: mockBriefResponses,
    projects: mockProjects,
    activities: mockActivities,
    conversations: mockConversations,
    files: mockFiles,
    feedback: mockFeedback,
    revisions: mockRevisions,
    notifications: mockNotifications,
    forms: mockForms,
    formResponses: mockFormResponses,
    contactMessages: [],
  }
  writeStore(store)
  if (canUseStorage()) {
    window.localStorage.setItem(KEYS.seeded, 'true')
  }
}

/** Reset all mock data back to the seeded defaults (dev tooling). */
export function resetDatabase(): void {
  const store: StorageShape = {
    users: mockUsers,
    clients: mockClientsProfiles,
    briefs: mockBriefs,
    briefResponses: mockBriefResponses,
    projects: mockProjects,
    activities: mockActivities,
    conversations: mockConversations,
    files: mockFiles,
    feedback: mockFeedback,
    revisions: mockRevisions,
    notifications: mockNotifications,
    forms: mockForms,
    formResponses: mockFormResponses,
    contactMessages: [],
  }
  writeStore(store)
  if (canUseStorage()) {
    window.localStorage.setItem(KEYS.seeded, 'true')
  }
}

// ---- Generic collection accessors -------------------------------------

export function getCollection<K extends keyof StorageShape>(
  key: K
): StorageShape[K] {
  return readStore()[key]
}

export function setCollection<K extends keyof StorageShape>(
  key: K,
  value: StorageShape[K]
): void {
  const store = readStore()
  store[key] = value
  writeStore(store)
}

export function upsertInCollection<K extends keyof StorageShape>(
  key: K,
  item: StorageShape[K][number] & { id: string }
): void {
  const store = readStore()
  const list = store[key] as Array<{ id: string }>
  const idx = list.findIndex((it) => it.id === item.id)
  if (idx === -1) {
    list.push(item)
  } else {
    list[idx] = item
  }
  writeStore(store)
}

export function removeFromCollection<K extends keyof StorageShape>(
  key: K,
  id: string
): void {
  const store = readStore()
  store[key] = (store[key] as Array<{ id: string }>).filter(
    (it) => it.id !== id
  ) as StorageShape[K]
  writeStore(store)
}

// ---- Session -----------------------------------------------------------

export function getSessionUserId(): string | null {
  if (!canUseStorage()) return null
  return window.localStorage.getItem(KEYS.session)
}

export function setSessionUserId(userId: string | null): void {
  if (!canUseStorage()) return
  if (userId === null) {
    window.localStorage.removeItem(KEYS.session)
  } else {
    window.localStorage.setItem(KEYS.session, userId)
  }
}

// ---- Generic key-value store ------------------------------------------

const KV_PREFIX = 'brievo:kv:'

/**
 * Persist an arbitrary JSON value under a namespaced key (e.g. a brief
 * draft). Isolated here so the UI never touches storage directly.
 */
export function setKV<T>(key: string, value: T): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(KV_PREFIX + key, JSON.stringify(value))
  } catch {
    /* ignore storage failures */
  }
}

export function getKV<T>(key: string): T | null {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(KV_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function removeKV(key: string): void {
  if (!canUseStorage()) return
  window.localStorage.removeItem(KV_PREFIX + key)
}
