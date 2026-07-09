import { Box, Flex, HStack, Link } from '@chakra-ui/react'
import { Link as RouterLink, Outlet } from 'react-router-dom'
import openDartsLogo from './assets/open-darts-logo.svg'
import klipprosLogo from './assets/klippros-logo.svg'
import { AppNavbar } from './components/AppNavbar'
import { ContentContainer } from './components/ContentContainer'
import { Footer } from './components/Footer'
import { toolbarControlSize } from './layout'

export const App = () => (
  <Box
    display="grid"
    gridTemplateRows="auto 1fr auto"
    h="100dvh"
    overflow="hidden"
    position="relative"
  >
    <Box as="header" flexShrink={0} position="relative" zIndex={1}>
      <ContentContainer>
        <Box py={4}>
          <Flex align="center" gap={4} minH={toolbarControlSize}>
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
              <Link
                asChild
                display="flex"
                alignItems="center"
                flexShrink={0}
                h={toolbarControlSize}
              >
                <RouterLink to="/" aria-label="Open Darts home">
                  <img
                    src={openDartsLogo}
                    alt="Open Darts"
                    style={{ height: toolbarControlSize, width: 'auto', display: 'block' }}
                  />
                </RouterLink>
              </Link>
            </HStack>
            <AppNavbar />
          </Flex>
        </Box>
      </ContentContainer>
    </Box>

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
)
