import type { AppNotification } from '@/types'

/** Mock notifications shown in the notification bell/panel. */
export const mockNotifications: AppNotification[] = [
  {
    id: 'n-1',
    userId: 'user-designer-1',
    type: 'system',
    title: 'New form submission',
    body: 'Maya Thompson submitted a response to “Wedding Planning & Design Intake”.',
    link: '/designer/forms/form-1/responses/response-1',
    read: false,
    createdAt: '2026-08-30T16:30:00.000Z',
  },
  {
    id: 'n-2',
    userId: 'user-designer-1',
    type: 'system',
    title: 'Form activated',
    body: '“Wedding Planning & Design Intake” is active and ready for client links.',
    link: '/designer/forms/form-1',
    read: true,
    createdAt: '2026-08-28T10:00:00.000Z',
  },
  {
    id: 'n-3',
    userId: 'user-designer-1',
    type: 'system',
    title: 'Draft form saved',
    body: '“Brand Discovery Questionnaire” was saved as a draft.',
    link: '/designer/forms/form-2',
    read: true,
    createdAt: '2026-08-28T09:15:00.000Z',
  },
]

