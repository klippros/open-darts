import { useCallback, useState } from 'react'
import { createX01Controller } from '../lib/game/createSession'
import { createSoloHumanPlayer } from '../lib/game/playerFactory'
import type { DartThrow } from '../types/dart'
import type { X01Config } from '../types/x01'

export const useX01Game = (config: X01Config) => {
  const createController = useCallback(
    () => createX01Controller([createSoloHumanPlayer()], config),
    [config],
  )

  const [controller, setController] = useState(createController)

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
