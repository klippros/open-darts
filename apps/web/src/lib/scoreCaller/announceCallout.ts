import { enqueueCallout } from './speakCallout'

const announcedKeys = new Set<string>()

export const clearAnnouncedCallouts = (sessionId: string): void => {
  const prefix = `${sessionId}:`

  for (const key of [...announcedKeys]) {
    if (key.startsWith(prefix)) {
      announcedKeys.delete(key)
    }
  }
}

export const resetAnnouncedCalloutsForTests = (): void => {
  announcedKeys.clear()
}

export const announceCalloutOnce = (key: string, phrase: string | null): void => {
  if (phrase === null || announcedKeys.has(key)) {
    return
  }

  announcedKeys.add(key)
  enqueueCallout(phrase)
}

export const legStartCalloutKey = (sessionId: string, leg: number): string =>
  `${sessionId}:leg:${leg}:start`

export const legRequireCalloutKey = (sessionId: string, leg: number): string =>
  `${sessionId}:leg:${leg}:require`

export const visitEndCalloutKey = (sessionId: string, visitIndex: number): string =>
  `${sessionId}:visit:${visitIndex}:end`

export const turnRequireCalloutKey = (
  sessionId: string,
  leg: number | undefined,
  turnIndex: number,
  visitsCount: number,
): string => `${sessionId}:leg:${leg ?? 0}:turn:${turnIndex}:visits:${visitsCount}:require`
