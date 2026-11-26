/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Future backend API base URL. Empty in frontend-only mock mode.
   * @example "https://api.yourdomain.com"
   */
  readonly VITE_API_URL: string
  /** Enables the development demo mode (floating account switcher). */
  readonly VITE_DEMO_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
