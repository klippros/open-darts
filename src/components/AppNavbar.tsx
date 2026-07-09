import { HStack, Link, Text } from '@chakra-ui/react'
import { NavLink } from 'react-router-dom'
import { useAccount } from '../hooks/accountContext'

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
  fontWeight: isActive ? 600 : 400,
  fontSize: '1.125rem',
  textDecoration: 'none',
  transition: 'color 0.15s ease',
})

export const AppNavbar = () => {
  const { account } = useAccount()

  return (
    <HStack as="nav" gap={6} flexShrink={0} aria-label="Main">
      <Link asChild>
        <NavLink to="/" end style={navLinkStyle}>
          Play
        </NavLink>
      </Link>
      <Link asChild>
        <NavLink to="/history" style={navLinkStyle}>
          History
        </NavLink>
      </Link>
      <Link asChild>
        <NavLink to="/about" style={navLinkStyle}>
          About
        </NavLink>
      </Link>
      {account !== null && (
        <Text fontSize="sm" color="whiteAlpha.600" display={{ base: 'none', md: 'block' }}>
          {account.displayName}
        </Text>
      )}
    </HStack>
  )
}
