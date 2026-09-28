import { Button, SimpleGrid, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { isOnlineMatchesEnabled } from '../../lib/matchServer/config'
import { explicitGameLaunchState } from '../../lib/routing/gameNavigation'
import { LiveIndicator } from '../LiveIndicator/LiveIndicator'
import type { HomePageModeLink } from './homePageModes'

export interface HomePageModeGridProps {
  modes: readonly HomePageModeLink[]
  explicitLaunch?: boolean
}

export const HomePageModeGrid = ({ modes, explicitLaunch = false }: HomePageModeGridProps) => (
  <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
    {modes.map((mode) => {
      const link = (
        <>
          <LiveIndicator show={isOnlineMatchesEnabled && mode.onlineCapable === true} />
          <Text fontSize="lg" fontWeight="semibold" color="white" whiteSpace="normal">
            {mode.label}
          </Text>
          <Text fontSize="sm" color="whiteAlpha.700" fontWeight="normal" whiteSpace="normal">
            {mode.description}
          </Text>
        </>
      )

      return (
        <Button
          key={mode.id}
          asChild
          variant="cta"
          h="auto"
          py={5}
          px={5}
          flexDirection="column"
          alignItems="flex-start"
          gap={1}
          textAlign="left"
          whiteSpace="normal"
          w="full"
          minW={0}
          position="relative"
        >
          {explicitLaunch ? (
            <RouterLink to={mode.to} state={explicitGameLaunchState()} style={{ minWidth: 0 }}>
              {link}
            </RouterLink>
          ) : (
            <RouterLink to={mode.to} style={{ minWidth: 0 }}>
              {link}
            </RouterLink>
          )}
        </Button>
      )
    })}
  </SimpleGrid>
)
