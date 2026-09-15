import { Box, Button, Heading, Spinner, Stack, Text } from '@chakra-ui/react'
import { useEffect } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { ContentContainer } from '../components/ContentContainer'
import { useAuth } from '../hooks/authContext'
import { resolveAuthReturnPath } from '../lib/auth/authRedirect'
import { AuthStatus } from '../types/auth'

export const AuthCallbackPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { authStatus } = useAuth()
  const returnTo = resolveAuthReturnPath(searchParams.get('next')) ?? '/history'

  useEffect(() => {
    if (authStatus === AuthStatus.Authenticated) {
      void navigate(returnTo, { replace: true })
    }
  }, [authStatus, navigate, returnTo])

  return (
    <ContentContainer>
      <Box py={{ base: 10, md: 16 }} maxW="520px" w="full" mx="auto">
        <Stack align="center" gap={4} textAlign="center">
          {authStatus === AuthStatus.Loading && <Spinner color="white" />}
          <Heading as="h1" size="lg" color="white">
            {authStatus === AuthStatus.Anonymous ? 'Sign-in link unavailable' : 'Finishing sign-in'}
          </Heading>
          <Text color="whiteAlpha.700">
            {authStatus === AuthStatus.Anonymous
              ? 'The link may have expired. Return home and request a new one.'
              : 'Your local completed games will be merged after sign-in.'}
          </Text>
          {authStatus === AuthStatus.Anonymous && (
            <Button asChild variant="cta">
              <RouterLink to="/">Return home</RouterLink>
            </Button>
          )}
        </Stack>
      </Box>
    </ContentContainer>
  )
}
