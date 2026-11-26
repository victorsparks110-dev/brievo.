import { useEffect } from 'react'

/** Set the document title for a page (for polished navigation UX). */
export function usePageMeta(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · BRIEVO` : 'BRIEVO'
    return () => {
      document.title = previous
    }
  }, [title])
}
