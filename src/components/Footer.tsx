import { Box, Flex, Link, Text } from '@chakra-ui/react'
import { ContentContainer } from './ContentContainer'

export const Footer = () => (
  <Box as="footer" position="sticky" bottom={0} zIndex={2} flexShrink={0} pt={2} pb={6}>
    <ContentContainer>
      <Flex
        align="center"
        justify="center"
        gap={{ base: 5, sm: 6 }}
        flexWrap="wrap"
        fontSize="xs"
        color="whiteAlpha.600"
      >
        <Text>© 2026 Klippros Studios AB</Text>
        <Link
          href="https://klippros.com/impressum.html"
          color="whiteAlpha.700"
          fontSize="xs"
          textDecoration="underline"
          textUnderlineOffset="2px"
          _hover={{ color: 'white' }}
        >
          Impressum
        </Link>
        <Link
          href="https://github.com/klippros/open-darts"
          rel="noopener noreferrer"
          target="_blank"
          color="whiteAlpha.700"
          fontSize="xs"
          textDecoration="underline"
          textUnderlineOffset="2px"
          _hover={{ color: 'white' }}
        >
          View on GitHub
        </Link>
      </Flex>
    </ContentContainer>
  </Box>
)
