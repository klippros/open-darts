import { useEffect } from 'react'
import type { GameController } from '../lib/game/GameController'
import { matchHasProgress } from '../lib/game/matchProgress'
import { useMatchAbort } from './useMatchAbort'

export const useRegisterMatchAbort = <State, Config>(controller: GameController<State, Config>) => {
  const { registerMatch, unregisterMatch } = useMatchAbort()

  useEffect(() => {
    registerMatch({
      hasProgress: matchHasProgress(controller),
      isComplete: controller.isComplete,
    })

    return () => {
      unregisterMatch()
    }
  }, [controller, registerMatch, unregisterMatch])
}
