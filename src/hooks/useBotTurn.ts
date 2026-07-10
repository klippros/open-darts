import { useEffect, useRef } from 'react'
import type { AppGameController } from '../lib/game/createSession'
import { generateBotDart, isBotTurn } from '../lib/bots/generateBotDart'
import type { DartThrow } from '../types/dart'

export interface UseBotTurnOptions {
  controller: AppGameController
  recordDart: (dart: DartThrow) => void
  enabled: boolean
}

export const useBotTurn = ({ controller, recordDart, enabled }: UseBotTurnOptions) => {
  const controllerRef = useRef(controller)
  const recordDartRef = useRef(recordDart)

  controllerRef.current = controller
  recordDartRef.current = recordDart

  useEffect(() => {
    if (!enabled || !isBotTurn(controllerRef.current)) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      const dart = generateBotDart(controllerRef.current)

      if (dart !== null) {
        recordDartRef.current(dart)
      }
    }, 650)

    return () => {
      window.clearTimeout(timer)
    }
  }, [enabled, controller])
}
