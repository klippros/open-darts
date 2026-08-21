import { Box, Button, Grid, Stack, Text } from '@chakra-ui/react'
import { VisitDartSlotCard } from '../Scoreboard/VisitDartSlotCard'
import { useUiSounds } from '../../hooks/useUiSounds'
import { buildBob27DartsForHitCount, type Bob27HitCount } from '../../lib/bob27/buildBob27Darts'
import { getBob27Target } from '../../lib/bob27/bob27Rules'
import type { DartThrow } from '../../types/dart'

export interface Bob27DartPickerProps {
  targetIndex: number
  onDarts: (darts: DartThrow[]) => void
  onUndo: () => void
  inputDisabled?: boolean
}

const HIT_COUNTS: Bob27HitCount[] = [0, 1, 2, 3]

export const Bob27DartPicker = ({
  targetIndex,
  onDarts,
  onUndo,
  inputDisabled = false,
}: Bob27DartPickerProps) => {
  const { playHit, playMiss } = useUiSounds()
  const target = getBob27Target(targetIndex)

  return (
    <Box
      position={{ base: 'sticky', md: 'static' }}
      bottom={0}
      zIndex={2}
      mx={{ base: -6, md: 0 }}
      px={{ base: 6, md: 0 }}
      pt={{ base: 6, md: 4 }}
      pb={{ base: 4, md: 0 }}
      bg={{ base: 'rgba(0, 0, 0, 0.72)', md: 'transparent' }}
      backdropFilter={{ base: 'blur(10px)', md: 'none' }}
      borderTopWidth={{ base: '1px', md: 0 }}
      borderColor="whiteAlpha.200"
    >
      <Stack gap={3}>
        <Grid templateColumns="repeat(4, 1fr)" gap={3}>
          {HIT_COUNTS.map((hitCount) => (
            <VisitDartSlotCard
              key={hitCount}
              label={String(hitCount)}
              variant={inputDisabled ? 'empty' : 'selectable'}
              size="comfortable"
              showArrow={false}
              disabled={inputDisabled}
              ariaLabel={
                hitCount === 0
                  ? `Miss all darts on ${target.label}`
                  : `Hit ${target.label} ${hitCount} time${hitCount === 1 ? '' : 's'}`
              }
              onClick={
                inputDisabled
                  ? undefined
                  : () => {
                      if (hitCount === 0) {
                        playMiss()
                      } else {
                        playHit()
                      }
                      onDarts(buildBob27DartsForHitCount(hitCount, targetIndex))
                    }
              }
            />
          ))}
        </Grid>

        <Button variant="cta" disabled={inputDisabled} onClick={onUndo}>
          Undo visit
        </Button>

        <Text fontSize="xs" color="whiteAlpha.500" lineHeight="1.5">
          Record how many times you hit {target.label}. Each hit adds the double score, zero hits
          subtract it; then the next target starts.
        </Text>
      </Stack>
    </Box>
  )
}
