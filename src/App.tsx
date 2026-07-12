import { Box, Flex } from '@chakra-ui/react'
import { Outlet } from 'react-router-dom'
import { AppHeader } from './components/AppHeader/AppHeader'
import { Footer } from './components/Footer'
import { AccountProvider } from './hooks/AccountProvider'
import { SettingsProvider } from './hooks/SettingsProvider'

export const App = () => (
  <AccountProvider>
    <SettingsProvider>
      <Box
        display="grid"
        gridTemplateRows="auto 1fr auto"
        h="100dvh"
        overflow="hidden"
        position="relative"
      >
        <AppHeader />

        <Flex
          as="main"
          minH={0}
          position="relative"
          zIndex={1}
          overflowY="auto"
          className="hide-scrollbar"
        >
          <Box w="full" minH="100%">
            <Outlet />
          </Box>
        </Flex>

        <Footer />
      </Box>
    </SettingsProvider>
  </AccountProvider>
)
