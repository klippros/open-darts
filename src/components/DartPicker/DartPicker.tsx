import { Box, Stack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useDartKeyboard } from '../../hooks/useDartKeyboard'
import { createDartKeyboardInputState } from '../../lib/dartKeyboardInput'
import type { ArmedMultiplier } from '../../lib/dartKeyboardInput'
import { createDartThrow } from '../../lib/dartScoring'
import { DartMultiplier, DartSegmentType } from '../../types/dart'
import type { DartThrow } from '../../types/dart'
import { DartBoardGraphic } from './DartBoardGraphic'
import { DARTBOARD_VIEWBOX_SIZE } from './dartboardLayout'
import { useDartBoardPointer } from './useDartBoardPointer'

export interface DartPickerProps {
  onDart: (dart: DartThrow) => void
  onUndo: () => void
  inputDisabled?: boolean
}

export const DartPicker = ({ onDart, onUndo, inputDisabled = false }: DartPickerProps) => {
  const [inputState, setInputState] = useState(createDartKeyboardInputState)

  const setArmedMultiplier = useCallback((armedMultiplier: ArmedMultiplier) => {
    setInputState((state) => ({
      ...state,
      armedMultiplier,
      numberBuffer: '',
    }))
  }, [])

  const { preview: keyboardPreview } = useDartKeyboard({
    inputState,
    setInputState,
    onDart,
    onUndo,
    inputDisabled,
  })

  const recordNumber = useCallback(
    (value: number, multiplier: DartMultiplier) => {
      onDart(createDartThrow({ type: DartSegmentType.Number, value }, multiplier))
    },
    [onDart],
  )

  const recordOuterBull = useCallback(() => {
    onDart(createDartThrow({ type: DartSegmentType.OuterBull }, DartMultiplier.Single))
  }, [onDart])

  const recordBull = useCallback(() => {
    onDart(createDartThrow({ type: DartSegmentType.Bull }, DartMultiplier.Single))
  }, [onDart])

  const recordMiss = useCallback(() => {
    onDart(createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss))
  }, [onDart])

  const {
    svgRef,
    activeMultiplier: pointerActiveMultiplier,
    hoveredNumber: pointerHoveredNumber,
    hoveredCorner: pointerHoveredCorner,
    hoveredCenterZone,
    activeCenterZone,
    handleCornerClick,
    handleNumberClick,
    handleCenterPointerDown,
    handleCornerHover,
    handleNumberHover,
    handleCenterHover,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  } = useDartBoardPointer({
    onUndo,
    recordNumber,
    recordBull,
    recordOuterBull,
    recordMiss,
    armedMultiplier: inputState.armedMultiplier,
    setArmedMultiplier,
    inputDisabled,
  })

  const hoveredNumber = keyboardPreview.highlightedNumber ?? pointerHoveredNumber
  const hoveredCorner = keyboardPreview.highlightOuterBull ? 'outerBull' : pointerHoveredCorner
  const activeMultiplier = pointerActiveMultiplier

  return (
    <Stack gap={3}>
      <Box
        w="100%"
        borderRadius="8px"
        overflow="hidden"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        touchAction="none"
        userSelect="none"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${DARTBOARD_VIEWBOX_SIZE} ${DARTBOARD_VIEWBOX_SIZE}`}
          width="100%"
          display="block"
          cursor="pointer"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerUp}
          opacity={inputDisabled ? 0.85 : 1}
          aria-label="Dartboard picker"
        >
          <DartBoardGraphic
            hoveredNumber={hoveredNumber}
            hoveredCorner={hoveredCorner}
            hoveredCenterZone={hoveredCenterZone}
            activeCenterZone={activeCenterZone}
            activeMultiplier={activeMultiplier}
            inputDisabled={inputDisabled}
            onCornerClick={handleCornerClick}
            onNumberClick={handleNumberClick}
            onCenterPointerDown={handleCenterPointerDown}
            onCornerHover={handleCornerHover}
            onNumberHover={handleNumberHover}
            onCenterHover={handleCenterHover}
          />
        </svg>
      </Box>
    </Stack>
  )
}
