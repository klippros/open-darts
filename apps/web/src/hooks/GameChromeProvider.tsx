import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { GameChromeContext } from './gameChromeContext'
import type { GameChromeState } from './gameChromeContext'

export const GameChromeProvider = ({ children }: { children: ReactNode }) => {
  const [chrome, setChrome] = useState<GameChromeState | null>(null)
  const value = useMemo(() => ({ chrome, setChrome }), [chrome])

  return <GameChromeContext.Provider value={value}>{children}</GameChromeContext.Provider>
}
