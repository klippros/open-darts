import { useEffect } from 'react'

export const useBeforeUnload = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // oxlint-disable-next-line typescript/no-deprecated -- Needed for cross-browser leave prompts
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled])
}
