export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  designer: '/designer',
  designerDashboard: '/designer',
  designerForms: '/designer/forms',
  designerForm: (id: string) => `/designer/forms/${id}`,
  designerResponses: '/designer/responses',
  designerResponse: (formId: string, responseId: string) =>
    `/designer/forms/${formId}/responses/${responseId}`,
  designerSettings: '/designer/settings',
  publicForm: (token: string) => `/form/${token}`,
  brief: (token: string) => `/brief/${token}`,
} as const

export const DESIGNER_NAV = [
  { label: 'Dashboard', to: ROUTES.designerDashboard },
  { label: 'Forms', to: ROUTES.designerForms },
  { label: 'Responses', to: ROUTES.designerResponses },
  { label: 'Settings', to: ROUTES.designerSettings },
] as const

/** Whether demo mode is enabled (see .env). */
export const isDemoMode = (): boolean =>
  import.meta.env.VITE_DEMO_MODE !== 'false'

/** Future backend API base URL. Unused in mock mode. */
export const API_URL = import.meta.env.VITE_API_URL ?? ''
