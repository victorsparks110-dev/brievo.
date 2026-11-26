import type { Conversation } from '@/types'

/** Example project conversations between designer and clients. */
export const mockConversations: Conversation[] = [
  {
    projectId: 'project-1',
    projectTitle: 'Bright Bloom — Logo & Brand Identity',
    designerId: 'user-designer-1',
    clientId: 'user-client-1',
    lastMessageAt: '2026-08-28T17:00:00.000Z',
    messages: [
      {
        id: 'msg-1-1',
        projectId: 'project-1',
        senderId: 'user-client-1',
        body: 'Hi Alex! I love the first concepts. The terracotta direction feels right for our studio.',
        createdAt: '2026-08-28T14:00:00.000Z',
      },
      {
        id: 'msg-1-2',
        projectId: 'project-1',
        senderId: 'user-designer-1',
        body: 'That is great to hear, Maya! I refined the primary mark and added a few lockups for review.',
        createdAt: '2026-08-28T15:30:00.000Z',
      },
      {
        id: 'msg-1-3',
        projectId: 'project-1',
        senderId: 'user-designer-1',
        body: 'The draft is now up in the project files — let me know what you think before we polish the type.',
        createdAt: '2026-08-28T16:00:00.000Z',
      },
      {
        id: 'msg-1-4',
        projectId: 'project-1',
        senderId: 'user-client-1',
        body: 'Perfect, checking now. Will get back to you today.',
        createdAt: '2026-08-28T17:00:00.000Z',
      },
    ],
  },
  {
    projectId: 'project-2',
    projectTitle: 'Nordica — Social Media & Flyer Pack',
    designerId: 'user-designer-1',
    clientId: 'user-client-2',
    lastMessageAt: '2026-08-29T10:30:00.000Z',
    messages: [
      {
        id: 'msg-2-1',
        projectId: 'project-2',
        senderId: 'user-client-2',
        body: 'The flyer layout is solid, but could the autumn tone be a bit warmer? A touch more cream.',
        createdAt: '2026-08-29T09:00:00.000Z',
      },
      {
        id: 'msg-2-2',
        projectId: 'project-2',
        senderId: 'user-client-2',
        body: 'And the social templates — the headline font feels close to our wordmark. Good.',
        createdAt: '2026-08-29T09:40:00.000Z',
      },
      {
        id: 'msg-2-3',
        projectId: 'project-2',
        senderId: 'user-designer-1',
        body: 'Noted on both. I will adjust the warmth and resubmit an updated version shortly.',
        createdAt: '2026-08-29T10:30:00.000Z',
      },
    ],
  },
  {
    projectId: 'project-3',
    projectTitle: 'Movement Fitness — Business Card Refresh',
    designerId: 'user-designer-1',
    clientId: 'user-client-3',
    lastMessageAt: '2026-08-29T09:30:00.000Z',
    messages: [
      {
        id: 'msg-3-1',
        projectId: 'project-3',
        senderId: 'user-client-3',
        body: 'Hi! We just uploaded the current logo file and brand colours as references.',
        createdAt: '2026-08-29T09:30:00.000Z',
      },
    ],
  },
]
