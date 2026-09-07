import { useEffect, useState } from 'react'

type DocumentWithWebkitFullscreen = Document & {
  webkitFullscreenEnabled?: boolean
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

type ElementWithWebkitFullscreen = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

const getFullscreenElement = (): Element | null => {
  const doc = document as DocumentWithWebkitFullscreen
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

const isFullscreenSupported = (): boolean => {
  const doc = document as DocumentWithWebkitFullscreen
  return Boolean(document.fullscreenEnabled || doc.webkitFullscreenEnabled)
}

const requestFullscreen = async (element: HTMLElement): Promise<void> => {
  const el = element as ElementWithWebkitFullscreen
  if (typeof element.requestFullscreen === 'function') {
    await element.requestFullscreen()
    return
  }
  if (typeof el.webkitRequestFullscreen === 'function') {
    await el.webkitRequestFullscreen()
  }
}

const exitFullscreen = async (): Promise<void> => {
  const doc = document as DocumentWithWebkitFullscreen
  if (typeof document.exitFullscreen === 'function') {
    await document.exitFullscreen()
    return
  }
  if (typeof doc.webkitExitFullscreen === 'function') {
    await doc.webkitExitFullscreen()
  }
}

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(() => getFullscreenElement() !== null)
  const isSupported = isFullscreenSupported()

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(getFullscreenElement() !== null)
    }

    document.addEventListener('fullscreenchange', syncFullscreen)
    document.addEventListener('webkitfullscreenchange', syncFullscreen)

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen)
      document.removeEventListener('webkitfullscreenchange', syncFullscreen)
      if (getFullscreenElement() !== null) {
        void exitFullscreen()
      }
    }
  }, [])

  const enter = async () => {
    if (!isSupported || getFullscreenElement() !== null) {
      return
    }
    await requestFullscreen(document.documentElement)
  }

  const exit = async () => {
    if (getFullscreenElement() === null) {
      return
    }
    await exitFullscreen()
  }

  const toggle = async () => {
    if (getFullscreenElement() !== null) {
      await exit()
      return
    }
    await enter()
  }

  return { isFullscreen, isSupported, enter, exit, toggle }
}
