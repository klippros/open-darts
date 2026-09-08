import { Button, SimpleGrid, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { explicitGameLaunchState } from '../../lib/routing/gameNavigation'
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
          <Text fontSize="lg" fontWeight="semibold" color="white">
            {mode.label}
          </Text>
          <Text fontSize="sm" color="whiteAlpha.700" fontWeight="normal">
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
        >
          {explicitLaunch ? (
            <RouterLink to={mode.to} state={explicitGameLaunchState()}>
              {link}
            </RouterLink>
          ) : (
            <RouterLink to={mode.to}>{link}</RouterLink>
          )}
        </Button>
      )
    })}
  </SimpleGrid>
)
