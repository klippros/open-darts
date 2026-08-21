import { AroundTheClockDartPicker } from './AroundTheClockDartPicker'
import { Bob27DartPicker } from './Bob27DartPicker'
import { DartPicker } from './DartPicker'
import { isAroundTheClockConfig } from '../../lib/game/gameConfigGuards'
import type { DartThrow } from '../../types/dart'
import type { GameConfig } from '../../types/gameMode'
import { GameModeId } from '../../types/gameMode'

export interface GameModeDartPickerProps {
  mode: GameModeId
  config: GameConfig
  aroundTheClockTargetIndex?: number
  bob27TargetIndex?: number
  pendingDarts: DartThrow[]
  onDart: (dart: DartThrow) => void
  onDarts: (darts: DartThrow[]) => void
  onUndo: () => void
  inputDisabled: boolean
}

export const GameModeDartPicker = ({
  mode,
  config,
  aroundTheClockTargetIndex,
  bob27TargetIndex,
  pendingDarts,
  onDart,
  onDarts,
  onUndo,
  inputDisabled,
}: GameModeDartPickerProps) => {
  if (
    mode === GameModeId.AroundTheClock &&
    isAroundTheClockConfig(mode, config) &&
    aroundTheClockTargetIndex !== undefined
  ) {
    return (
      <AroundTheClockDartPicker
        committedTargetIndex={aroundTheClockTargetIndex}
        pendingDarts={pendingDarts}
        config={config}
        onDarts={onDarts}
        onUndo={onUndo}
        inputDisabled={inputDisabled}
      />
    )
  }

  if (mode === GameModeId.Bob27 && bob27TargetIndex !== undefined) {
    return (
      <Bob27DartPicker
        targetIndex={bob27TargetIndex}
        onDarts={onDarts}
        onUndo={onUndo}
        inputDisabled={inputDisabled}
      />
    )
  }

  return <DartPicker onDart={onDart} onUndo={onUndo} inputDisabled={inputDisabled} />
}
