import { useCallback, useEffect, useState } from 'react'
import { createGameController } from '../lib/game/createSession'
import type { CreateSessionParams } from '../lib/game/createSession'
import type { DartThrow } from '../types/dart'

export const useGame = (launchParams: CreateSessionParams) => {
  const createController = useCallback(() => createGameController(launchParams), [launchParams])

  const [controller, setController] = useState(createController)

  useEffect(() => {
    setController(createController())
  }, [createController])

  const recordDart = useCallback((dart: DartThrow) => {
    setController((current) => current.recordDart(dart))
  }, [])

  const undoDart = useCallback(() => {
    setController((current) => current.undoDart())
  }, [])

  const restart = useCallback(() => {
    setController(createController())
  }, [createController])

  return {
    controller,
    recordDart,
    undoDart,
    restart,
  }
}
