import { Box, Flex } from '@chakra-ui/react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from './components/AppHeader/AppHeader'
import { Footer } from './components/Footer'
import { AccountProvider } from './hooks/AccountProvider'
import { GameChromeProvider } from './hooks/GameChromeProvider'
import { SettingsProvider } from './hooks/SettingsProvider'

export const App = () => {
  const { pathname } = useLocation()
  const isGameRoute = pathname === '/game'

  return (
    <AccountProvider>
      <SettingsProvider>
        <GameChromeProvider>
          <Box
            h="100dvh"
            overflow="hidden"
            display="flex"
            flexDirection="column"
            position="relative"
          >
            <AppHeader />

            <Flex
              as="main"
              flex="1"
              minH={0}
              position="relative"
              zIndex={1}
              overflowY={isGameRoute ? 'hidden' : 'auto'}
              className="hide-scrollbar"
            >
              <Flex direction="column" w="full" minH="100%" h={isGameRoute ? '100%' : undefined}>
                <Box
                  flex="1"
                  minH={isGameRoute ? 0 : undefined}
                  h={isGameRoute ? '100%' : undefined}
                  display={isGameRoute ? 'flex' : undefined}
                  flexDirection={isGameRoute ? 'column' : undefined}
                >
                  <Outlet />
                </Box>
                {!isGameRoute && <Footer />}
              </Flex>
            </Flex>
          </Box>
        </GameChromeProvider>
      </SettingsProvider>
    </AccountProvider>
  )
}
