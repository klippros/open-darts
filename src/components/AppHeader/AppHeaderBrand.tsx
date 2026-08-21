import { HStack, Link } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import openDartsLogo from '../../assets/open-darts-logo.svg'
import klipprosLogo from '../../assets/klippros-logo.svg'
import { useGameChrome } from '../../hooks/gameChromeContext'
import { toolbarControlSize } from '../../layout'
import { GameLeaveControl } from '../GameLeaveControl/GameLeaveControl'

/** Left-side brand row; during a match, replaced by the leave control. */
export const AppHeaderBrand = () => {
  const gameChrome = useGameChrome()
  const showMatchControls = gameChrome?.active === true

  if (showMatchControls) {
    return (
      <HStack flex="1" gap={1} align="center" minW={0}>
        <GameLeaveControl />
      </HStack>
    )
  }

  return (
    <HStack flex="1" gap={5} align="center" minW={0}>
      <Link
        href="https://klippros.com"
        target="_blank"
        rel="noopener noreferrer"
        display="flex"
        alignItems="center"
        flexShrink={0}
        h={toolbarControlSize}
        transition="transform 0.15s ease"
        _hover={{ transform: 'scale(1.08)' }}
        aria-label="Klippros"
      >
        <img
          src={klipprosLogo}
          alt=""
          style={{ height: toolbarControlSize, width: 'auto', display: 'block' }}
        />
      </Link>
      <Link asChild display="flex" alignItems="center" flexShrink={0} h={toolbarControlSize}>
        <RouterLink to="/" aria-label="Open Darts home">
          <img
            src={openDartsLogo}
            alt="Open Darts"
            style={{ height: toolbarControlSize, width: 'auto', display: 'block' }}
          />
        </RouterLink>
      </Link>
    </HStack>
  )
}
