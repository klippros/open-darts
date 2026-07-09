import { Box, Text } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useDartKeyboard } from '../../hooks/useDartKeyboard'
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
  useDartKeyboard({ onDart, onUndo, inputDisabled })

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
    activeMultiplier,
    hoveredNumber,
    hoveredCorner,
    activeCenterZone,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  } = useDartBoardPointer({
    onUndo,
    recordNumber,
    recordBull,
    recordOuterBull,
    recordMiss,
    inputDisabled,
  })

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
          onPointerDown={handlePointerDown}
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
            activeCenterZone={activeCenterZone}
            activeMultiplier={activeMultiplier}
          />
        </svg>
      </Box>

      <Text mt={3} display={{ base: 'none', md: 'block' }} fontSize="xs" color="whiteAlpha.500">
        Tap a segment for a single. Press Double or Triple in the center, then tap a segment, or
        drag from the center onto a number. Corners: Bull, 25, Undo, Miss.
      </Text>
    </Box>
  )
}
