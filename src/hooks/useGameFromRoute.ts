import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseGameLaunchParams } from '../lib/game/gameRoute'
import { useGame } from './useGame'

export const useGameFromRoute = () => {
  const [searchParams] = useSearchParams()
  const launchParams = useMemo(() => parseGameLaunchParams(searchParams), [searchParams])

  return useGame(launchParams)
}
