import { Button } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { toolbarControlSize } from '../../layout'

/** Plain Button element for Chakra `asChild` triggers (must not be a wrapper component). */
export const createToolbarIconButton = (ariaLabel: string, children: ReactNode) => (
  <Button
    aria-label={ariaLabel}
    variant="ghost"
    color="whiteAlpha.800"
    minW={toolbarControlSize}
    w={toolbarControlSize}
    h={toolbarControlSize}
    p={0}
    _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
    _expanded={{ color: 'white', bg: 'whiteAlpha.100' }}
  >
    {children}
  </Button>
)

/** Plain Button element for the mobile-drawer Settings row (`asChild` trigger). */
export const createSettingsNavButton = () => (
  <Button
    variant="ghost"
    justifyContent="flex-start"
    color="whiteAlpha.700"
    fontWeight={400}
    fontSize="1.125rem"
    h="auto"
    px={2}
    py={1}
    mx={-2}
    borderRadius="md"
    _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
    _expanded={{ color: 'white', bg: 'whiteAlpha.100' }}
  >
    Settings
  </Button>
)
