import { Box } from '@chakra-ui/react'
import { faAnglesLeft, faAnglesRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export type LegStarterIconDirection = 'left' | 'right'

export interface LegStarterIconProps {
  direction?: LegStarterIconDirection
}

export const LegStarterIcon = ({ direction = 'left' }: LegStarterIconProps) => (
  <Box as="span" aria-label="Started the leg" color="whiteAlpha.600" lineHeight={0}>
    <FontAwesomeIcon
      icon={direction === 'right' ? faAnglesRight : faAnglesLeft}
      style={{ height: '0.85em' }}
    />
  </Box>
)
