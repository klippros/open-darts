import { Box, Stack, Text } from '@chakra-ui/react'
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
    <Box
      position={{ base: 'sticky', md: 'static' }}
      bottom={0}
      zIndex={2}
      mx={{ base: -6, md: 0 }}
      px={{ base: 6, md: 0 }}
      pt={{ base: 4, md: 0 }}
      pb={{ base: 4, md: 0 }}
      bg={{ base: 'rgba(0, 0, 0, 0.72)', md: 'transparent' }}
      backdropFilter={{ base: 'blur(10px)', md: 'none' }}
      borderTopWidth={{ base: '1px', md: 0 }}
      borderColor="whiteAlpha.200"
    >
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

      <Stack mt={3} gap={1} fontSize="xs" color="whiteAlpha.500">
        <Text>
          Keyboard: D/T for double/triple, type the segment number, then Space to confirm. B bull,
          Tab miss, Backspace undo, Esc clear modifier.
        </Text>
        <Text display={{ base: 'none', md: 'block' }}>
          Tap the board to score. Center arms double/triple; corners are Bull, 25, Undo, and Miss.
        </Text>
      </Stack>
    </Box>
  )
}
