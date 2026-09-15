import { AroundTheClockDartPicker } from './AroundTheClockDartPicker'
import { Bob27DartPicker } from './Bob27DartPicker'
import { DartPicker } from './DartPicker'
import { ScoringInputCard } from './ScoringInputCard/ScoringInputCard'
import { TenUpOneDownDartPicker } from './TenUpOneDownDartPicker'
import { VisitScorePicker } from './VisitScorePicker/VisitScorePicker'
import { isAroundTheClockConfig } from '@open-darts/game/game/gameConfigGuards'
import { supportsVisitScoreInput } from '@open-darts/game/game/gameModeDefinitions'
import type { DartThrow } from '@open-darts/game/types/dart'
import type { GameConfig } from '@open-darts/game/types/gameMode'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { VisitInputMode } from '@open-darts/game/types/visit'

export interface GameModeDartPickerProps {
  mode: GameModeId
  config: GameConfig
  aroundTheClockTargetIndex?: number
  bob27TargetIndex?: number
  checkoutTarget?: number
  pendingDarts: DartThrow[]
  visitEntryMode: VisitInputMode
  onVisitEntryModeChange: (mode: VisitInputMode) => void
  onDart: (dart: DartThrow) => void
  onDarts: (darts: DartThrow[]) => void
  onVisitScore: (score: number) => void
  onUndo: () => void
  inputDisabled: boolean
  undoDisabled?: boolean
}

export const GameModeDartPicker = ({
  mode,
  config,
  aroundTheClockTargetIndex,
  bob27TargetIndex,
  checkoutTarget,
  pendingDarts,
  visitEntryMode,
  onVisitEntryModeChange,
  onDart,
  onDarts,
  onVisitScore,
  onUndo,
  inputDisabled,
  undoDisabled = inputDisabled,
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
        undoDisabled={undoDisabled}
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
        undoDisabled={undoDisabled}
      />
    )
  }

  if (!supportsVisitScoreInput(mode)) {
    return (
      <DartPicker
        onDart={onDart}
        onUndo={onUndo}
        inputDisabled={inputDisabled}
        undoDisabled={undoDisabled}
      />
    )
  }

  const hasPendingDarts = pendingDarts.length > 0
  const showVisitScorePicker = visitEntryMode === VisitInputMode.VisitScore && !hasPendingDarts

  return (
    <ScoringInputCard
      entryMode={visitEntryMode}
      visitTabDisabled={hasPendingDarts}
      onEntryModeChange={onVisitEntryModeChange}
    >
      {showVisitScorePicker ? (
        mode === GameModeId.TenUpOneDown && checkoutTarget !== undefined ? (
          <TenUpOneDownDartPicker
            checkoutTarget={checkoutTarget}
            onVisitScore={onVisitScore}
            onUndo={onUndo}
            inputDisabled={inputDisabled}
            undoDisabled={undoDisabled}
          />
        ) : (
          <VisitScorePicker
            onSubmit={onVisitScore}
            onUndo={onUndo}
            inputDisabled={inputDisabled}
            undoDisabled={undoDisabled}
          />
        )
      ) : (
        <DartPicker
          onDart={onDart}
          onUndo={onUndo}
          inputDisabled={inputDisabled}
          undoDisabled={undoDisabled}
        />
      )}
    </ScoringInputCard>
  )
}
