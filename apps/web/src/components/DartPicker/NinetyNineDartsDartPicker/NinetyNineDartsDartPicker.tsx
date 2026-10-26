import { Grid, Stack } from '@chakra-ui/react'
import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { VisitDartSlotCard } from '../../Scoreboard/VisitDartSlotCard'
import { PressScaleButton } from '../../PressScaleButton/PressScaleButton'
import { scoringActionTypeProps } from '../../../scoringType'
import { useUiSounds } from '../../../hooks/useUiSounds'
import { buildNinetyNineDartsThrow } from '@open-darts/game/ninetyNineDarts/buildNinetyNineDarts'
import {
  getNinetyNineDartsOutcome,
  getNinetyNineDartsPickerOutcomes,
  NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT,
} from '@open-darts/game/ninetyNineDarts/ninetyNineDartsRules'
import { NinetyNineDartsOutcome } from '@open-darts/game/types/ninetyNineDarts'
import type { NinetyNineDartsTarget } from '@open-darts/game/types/ninetyNineDarts'
import type { DartThrow } from '@open-darts/game/types/dart'
import {
  fieldCenterRadius,
  getNinetyNineDartsSwipeCommit,
  resolveNinetyNineDartsSwipe,
} from './ninetyNineDartsSwipe'
import type { NinetyNineDartsFieldCenter, NinetyNineDartsSwipeSample } from './ninetyNineDartsSwipe'

export interface NinetyNineDartsDartPickerProps {
  target: NinetyNineDartsTarget
  pendingDarts: DartThrow[]
  /** Append only new darts — must not re-send already pending throws. */
  onDarts: (darts: DartThrow[]) => void
  onUndo: () => void
  inputDisabled?: boolean
  undoDisabled?: boolean
}

const OUTCOME_LABELS: Record<NinetyNineDartsOutcome, string> = {
  [NinetyNineDartsOutcome.Miss]: 'Miss',
  [NinetyNineDartsOutcome.Single]: 'Single',
  [NinetyNineDartsOutcome.Double]: 'Double',
  [NinetyNineDartsOutcome.Triple]: 'Treble',
}

const SWIPE_OUTCOMES = new Set<string>(Object.values(NinetyNineDartsOutcome))

/** Picker outcomes are bottom→top; reverse for visual column (Double at top). */
const reverseForDisplay = <T,>(items: T[]): T[] => [...items].reverse()

const getOutcomeSlotSize = (
  outcome: NinetyNineDartsOutcome,
  hasTriple: boolean,
): 'comfortable' | 'comfortableHalf' =>
  hasTriple && outcome === NinetyNineDartsOutcome.Double ? 'comfortableHalf' : 'comfortable'

const isSwipeOutcome = (value: string): value is NinetyNineDartsOutcome => SWIPE_OUTCOMES.has(value)

const toneForOutcome = (outcome: NinetyNineDartsOutcome): 'red' | 'green' =>
  outcome === NinetyNineDartsOutcome.Miss ? 'red' : 'green'

export const NinetyNineDartsDartPicker = ({
  target,
  pendingDarts,
  onDarts,
  onUndo,
  inputDisabled = false,
  undoDisabled = inputDisabled,
}: NinetyNineDartsDartPickerProps) => {
  const { playHit, playMiss } = useUiSounds()
  const outcomes = getNinetyNineDartsPickerOutcomes(target)
  const displayOutcomes = reverseForDisplay(outcomes)
  const hasTriple = outcomes.includes(NinetyNineDartsOutcome.Triple)
  const pendingCount = pendingDarts.length

  const gridRef = useRef<HTMLDivElement>(null)
  const samplesRef = useRef<NinetyNineDartsSwipeSample[]>([])
  const centersRef = useRef<NinetyNineDartsFieldCenter[]>([])
  const swipeActiveRef = useRef(false)
  const suppressClickRef = useRef(false)
  const [previewOutcomes, setPreviewOutcomes] = useState<NinetyNineDartsOutcome[]>([])
  const isSwiping = previewOutcomes.length > 0

  const readFieldCenters = useCallback((): NinetyNineDartsFieldCenter[] => {
    const grid = gridRef.current

    if (grid === null) {
      return []
    }

    const centers: NinetyNineDartsFieldCenter[] = []

    for (const cell of grid.querySelectorAll<HTMLElement>('[data-swipe-column]')) {
      const column = Number(cell.dataset.swipeColumn)
      const outcomeValue = cell.dataset.swipeOutcome

      if (
        !Number.isInteger(column) ||
        outcomeValue === undefined ||
        !isSwipeOutcome(outcomeValue)
      ) {
        continue
      }

      const rect = cell.getBoundingClientRect()
      centers.push({
        column,
        outcome: outcomeValue,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        radius: fieldCenterRadius(rect.width, rect.height),
      })
    }

    return centers
  }, [])

  const recordOutcomes = useCallback(
    (resolved: NinetyNineDartsOutcome[]) => {
      if (inputDisabled || resolved.length === 0) {
        return
      }

      const remaining = NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT - pendingCount
      const toRecord = resolved.slice(0, Math.max(0, remaining))

      if (toRecord.length === 0) {
        return
      }

      if (toRecord.every((outcome) => outcome === NinetyNineDartsOutcome.Miss)) {
        playMiss()
      } else {
        playHit()
      }

      onDarts(toRecord.map((outcome) => buildNinetyNineDartsThrow(outcome, target)))
    },
    [inputDisabled, onDarts, pendingCount, playHit, playMiss, target],
  )

  const hitTest = useCallback(
    (
      clientX: number,
      clientY: number,
    ): { column: number; outcome: NinetyNineDartsOutcome } | null => {
      const grid = gridRef.current

      if (grid === null) {
        return null
      }

      const cells = grid.querySelectorAll<HTMLElement>('[data-swipe-column]')

      for (const cell of cells) {
        const rect = cell.getBoundingClientRect()

        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          continue
        }

        const column = Number(cell.dataset.swipeColumn)
        const outcomeValue = cell.dataset.swipeOutcome

        if (
          !Number.isInteger(column) ||
          outcomeValue === undefined ||
          !isSwipeOutcome(outcomeValue)
        ) {
          continue
        }

        return { column, outcome: outcomeValue }
      }

      return null
    },
    [],
  )

  const appendSample = useCallback(
    (clientX: number, clientY: number) => {
      const hit = hitTest(clientX, clientY)
      const last = samplesRef.current.at(-1)
      const resolvedHit =
        hit ?? (last === undefined ? null : { column: last.column, outcome: last.outcome })

      if (resolvedHit === null) {
        return
      }

      const sample: NinetyNineDartsSwipeSample = {
        column: resolvedHit.column,
        outcome: resolvedHit.outcome,
        x: clientX,
        y: clientY,
      }

      samplesRef.current = [...samplesRef.current, sample]
      setPreviewOutcomes(
        resolveNinetyNineDartsSwipe(samplesRef.current, pendingCount, centersRef.current),
      )
    },
    [hitTest, pendingCount],
  )

  const endSwipe = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!swipeActiveRef.current) {
        return
      }

      swipeActiveRef.current = false
      suppressClickRef.current = true

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      appendSample(event.clientX, event.clientY)
      const committed = getNinetyNineDartsSwipeCommit(
        samplesRef.current,
        pendingCount,
        NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT,
        centersRef.current,
      )
      samplesRef.current = []
      centersRef.current = []
      setPreviewOutcomes([])
      recordOutcomes(committed)
    },
    [appendSample, pendingCount, recordOutcomes],
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (inputDisabled || pendingCount >= NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT) {
      return
    }

    if (event.button !== 0) {
      return
    }

    const hit = hitTest(event.clientX, event.clientY)

    if (hit === null || hit.column !== pendingCount) {
      return
    }

    swipeActiveRef.current = true
    samplesRef.current = []
    centersRef.current = readFieldCenters()
    event.currentTarget.setPointerCapture(event.pointerId)
    appendSample(event.clientX, event.clientY)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!swipeActiveRef.current) {
      return
    }

    appendSample(event.clientX, event.clientY)
  }

  const handleSlotClick = (outcome: NinetyNineDartsOutcome) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    recordOutcomes([outcome])
  }

  /** Furthest column that currently has a resolved preview dart. */
  const tipColumn =
    isSwiping && !inputDisabled ? pendingCount + previewOutcomes.length - 1 : pendingCount
  /** Next empty column unlocked for the ongoing stroke. */
  const availableColumn =
    isSwiping && tipColumn + 1 < NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT && !inputDisabled
      ? tipColumn + 1
      : null

  const previewForColumn = (slotIndex: number): NinetyNineDartsOutcome | null => {
    if (previewOutcomes.length === 0 || slotIndex < pendingCount) {
      return null
    }

    return previewOutcomes[slotIndex - pendingCount] ?? null
  }

  return (
    <Stack gap={3}>
      <Grid
        ref={gridRef}
        templateColumns={`repeat(${NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT}, 1fr)`}
        gap={3}
        touchAction="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
      >
        {Array.from({ length: NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT }, (_, slotIndex) => {
          const isThrown = slotIndex < pendingCount
          const isTapTarget = slotIndex === pendingCount && !inputDisabled && !isSwiping
          const previewOutcome = previewForColumn(slotIndex)
          const isTipColumn = isSwiping && slotIndex === tipColumn
          const isAvailableColumn = availableColumn === slotIndex
          const isLiveColumn = isTipColumn || isAvailableColumn
          const thrownDart = pendingDarts[slotIndex]
          const thrownOutcome =
            thrownDart === undefined ? null : getNinetyNineDartsOutcome(thrownDart, target)

          if (isThrown) {
            return (
              <Stack key={slotIndex} gap={2}>
                {displayOutcomes.map((outcome) => (
                  <VisitDartSlotCard
                    key={outcome}
                    label={outcome === thrownOutcome ? OUTCOME_LABELS[outcome] : null}
                    variant={outcome === thrownOutcome ? 'thrown' : 'empty'}
                    tone={outcome === thrownOutcome ? toneForOutcome(outcome) : 'neutral'}
                    size={getOutcomeSlotSize(outcome, hasTriple)}
                    showArrow={false}
                  />
                ))}
              </Stack>
            )
          }

          return (
            <Stack key={slotIndex} gap={2}>
              {displayOutcomes.map((outcome) => {
                const isPreview = previewOutcome === outcome
                const showActiveChrome = isTapTarget || isLiveColumn || isPreview

                return (
                  <Stack
                    key={outcome}
                    data-swipe-column={slotIndex}
                    data-swipe-outcome={outcome}
                    gap={0}
                  >
                    <VisitDartSlotCard
                      label={OUTCOME_LABELS[outcome]}
                      variant={showActiveChrome ? 'selectable' : 'empty'}
                      tone={showActiveChrome ? toneForOutcome(outcome) : 'neutral'}
                      size={getOutcomeSlotSize(outcome, hasTriple)}
                      showArrow={false}
                      preview={isPreview}
                      disabled={!isTapTarget}
                      ariaLabel={`${OUTCOME_LABELS[outcome]} on dart ${slotIndex + 1}`}
                      onClick={
                        isTapTarget
                          ? () => {
                              handleSlotClick(outcome)
                            }
                          : undefined
                      }
                    />
                  </Stack>
                )
              })}
            </Stack>
          )
        })}
      </Grid>

      <PressScaleButton
        variant="cta"
        {...scoringActionTypeProps}
        disabled={undoDisabled}
        onClick={onUndo}
      >
        Undo last dart
      </PressScaleButton>
    </Stack>
  )
}
