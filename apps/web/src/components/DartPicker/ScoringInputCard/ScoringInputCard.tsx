import { Box, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { VisitInputMode } from '../../../types/visit'
import { ScoringFolderTab } from './ScoringFolderTab'

export interface ScoringInputCardProps {
  entryMode: VisitInputMode
  visitTabDisabled?: boolean
  onEntryModeChange: (mode: VisitInputMode) => void
  children: ReactNode
}

export const ScoringInputCard = ({
  entryMode,
  visitTabDisabled = false,
  onEntryModeChange,
  children,
}: ScoringInputCardProps) => (
  <Box>
    <Flex justify="flex-end" align="flex-end" gap={1} px={2} position="relative" zIndex={2}>
      <ScoringFolderTab
        label="Visit"
        active={entryMode === VisitInputMode.VisitScore}
        disabled={visitTabDisabled}
        onClick={() => {
          onEntryModeChange(VisitInputMode.VisitScore)
        }}
      />
      <ScoringFolderTab
        label="Dart"
        active={entryMode === VisitInputMode.PerDart}
        onClick={() => {
          onEntryModeChange(VisitInputMode.PerDart)
        }}
      />
    </Flex>
    <Box
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      position="relative"
      zIndex={0}
      px={3}
      py={3}
    >
      {children}
    </Box>
  </Box>
)
