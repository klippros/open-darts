import { Flex, Text } from '@chakra-ui/react'
import { faTrophy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { LegStarterIcon } from '../LegStarterIcon/LegStarterIcon'

export interface PlayerMatchColumnHeaderProps {
  name: string
  showTrophy?: boolean
  showLegStarter?: boolean
}

export const PlayerMatchColumnHeader = ({
  name,
  showTrophy = false,
  showLegStarter = false,
}: PlayerMatchColumnHeaderProps) => (
  <Flex align="center" gap={1.5} justify="flex-end">
    {showTrophy && <FontAwesomeIcon icon={faTrophy} aria-hidden />}
    <Text fontSize="sm" color="whiteAlpha.700">
      {name}
    </Text>
    {showLegStarter && <LegStarterIcon direction="left" />}
  </Flex>
)
