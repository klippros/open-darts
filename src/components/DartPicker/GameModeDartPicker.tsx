import { AroundTheClockDartPicker } from './AroundTheClockDartPicker'
import { Bob27DartPicker } from './Bob27DartPicker'
import { DartPicker } from './DartPicker'
import { VisitScorePicker } from './VisitScorePicker/VisitScorePicker'
import { isAroundTheClockConfig } from '../../lib/game/gameConfigGuards'
import type { DartThrow } from '../../types/dart'
import type { GameConfig } from '../../types/gameMode'
import { GameModeId } from '../../types/gameMode'
import { X01InputMode } from '../../types/settings'

const supportsVisitScoreInput = (mode: GameModeId): boolean =>
  mode === GameModeId.X01 || mode === GameModeId.OneTwentyOne || mode === GameModeId.TenUpOneDown

export interface GameModeDartPickerProps {
  mode: GameModeId
  config: GameConfig
  aroundTheClockTargetIndex?: number
  bob27TargetIndex?: number
  pendingDarts: DartThrow[]
  x01InputMode: X01InputMode
  onDart: (dart: DartThrow) => void
  onDarts: (darts: DartThrow[]) => void
  onVisitScore: (score: number) => void
  onUndo: () => void
  inputDisabled: boolean
}

export const GameModeDartPicker = ({
  mode,
  config,
  aroundTheClockTargetIndex,
  bob27TargetIndex,
  pendingDarts,
  x01InputMode,
  onDart,
  onDarts,
  onVisitScore,
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

  const useVisitScorePicker =
    supportsVisitScoreInput(mode) &&
    x01InputMode === X01InputMode.VisitScore &&
    pendingDarts.length === 0

  if (useVisitScorePicker) {
    return (
      <VisitScorePicker onSubmit={onVisitScore} onUndo={onUndo} inputDisabled={inputDisabled} />
    )
  }

  return <DartPicker onDart={onDart} onUndo={onUndo} inputDisabled={inputDisabled} />
}
