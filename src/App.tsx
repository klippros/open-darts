import { Box, Flex } from '@chakra-ui/react'
import { Outlet } from 'react-router-dom'
import { AppHeader } from './components/AppHeader/AppHeader'
import { Footer } from './components/Footer'
import { AccountProvider } from './hooks/AccountProvider'
import { SettingsProvider } from './hooks/SettingsProvider'

export const App = () => (
  <AccountProvider>
    <SettingsProvider>
      <Box h="100dvh" overflow="hidden" display="flex" flexDirection="column" position="relative">
        <AppHeader />

        <Flex
          as="main"
          flex="1"
          minH={0}
          position="relative"
          zIndex={1}
          overflowY="auto"
          className="hide-scrollbar"
        >
          <Flex direction="column" w="full" minH="100%">
            <Box flex="1">
              <Outlet />
            </Box>
            <Footer />
          </Flex>
        </Flex>
      </Box>
    </SettingsProvider>
  </AccountProvider>
)
