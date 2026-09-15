import { HStack } from '@chakra-ui/react'
import { faHeart } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { formatOneTwentyOneLivesAriaLabel } from '../../lib/oneTwentyOne/formatOneTwentyOneLives'

export interface OneTwentyOneLivesProps {
  lives: number
}

export const OneTwentyOneLives = ({ lives }: OneTwentyOneLivesProps) => (
  <HStack gap={1} fontSize="md" lineHeight="1" aria-label={formatOneTwentyOneLivesAriaLabel(lives)}>
    {Array.from({ length: Math.max(0, lives) }, (_, index) => (
      <FontAwesomeIcon
        key={index}
        icon={faHeart}
        aria-hidden
        style={{ height: '1em', width: '1em' }}
      />
    ))}
  </HStack>
)
