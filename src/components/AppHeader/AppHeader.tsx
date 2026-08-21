import { Box, Flex, HStack } from '@chakra-ui/react'
import { useGameChrome } from '../../hooks/gameChromeContext'
import { toolbarControlSize } from '../../layout'
import { AppNavbar } from '../AppNavbar/AppNavbar'
import { ContentContainer } from '../ContentContainer'
import { GameFullscreenControl } from '../GameFullscreenControl/GameFullscreenControl'
import { GameHelpControl } from '../GameHelpControl/GameHelpControl'
import { MobileNavMenu } from '../MobileNavMenu/MobileNavMenu'
import { SettingsMenu } from '../SettingsMenu/SettingsMenu'
import { AppHeaderBrand } from './AppHeaderBrand'

export const AppHeader = () => {
  const gameChrome = useGameChrome()
  const isActiveMatch = gameChrome?.active === true

  return (
    <Box as="header" flexShrink={0} position="relative" zIndex={1}>
      <ContentContainer>
        <Box py={isActiveMatch ? 2 : 4}>
          <Flex align="center" gap={4} minH={toolbarControlSize}>
            <AppHeaderBrand />
            <HStack gap={{ base: 1, md: isActiveMatch ? 1 : 6 }} flexShrink={0} align="center">
              {!isActiveMatch && <AppNavbar />}
              {!isActiveMatch && <MobileNavMenu />}
              {isActiveMatch && <GameHelpControl />}
              {isActiveMatch && <GameFullscreenControl />}
              <Box display={isActiveMatch ? 'block' : { base: 'none', md: 'block' }}>
                <SettingsMenu />
              </Box>
            </HStack>
          </Flex>
        </Box>
      </ContentContainer>
    </Box>
  )
}
