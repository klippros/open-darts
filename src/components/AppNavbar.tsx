import { HStack, Link, Text } from '@chakra-ui/react'
import { NavLink } from 'react-router-dom'
import { useAccount } from '../hooks/accountContext'
import { BetaBadge } from './BetaBadge/BetaBadge'

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
  fontWeight: isActive ? 600 : 400,
  fontSize: '1.125rem',
  textDecoration: 'none',
  transition: 'color 0.15s ease',
})

const NavItem = ({ to, label, beta = false }: { to: string; label: string; beta?: boolean }) => (
  <Link asChild>
    <NavLink to={to} end={to === '/'} style={navLinkStyle}>
      <HStack as="span" gap={2} display="inline-flex" alignItems="center">
        <Text as="span">{label}</Text>
        {beta && <BetaBadge />}
      </HStack>
    </NavLink>
  </Link>
)

export const AppNavbar = () => {
  const { account } = useAccount()

  return (
    <HStack as="nav" gap={6} flexShrink={0} aria-label="Main">
      <NavItem to="/" label="Play" />
      <NavItem to="/history" label="History" beta />
      <NavItem to="/stats" label="Stats" beta />
      <NavItem to="/about" label="About" />
      {account !== null && (
        <Text fontSize="sm" color="whiteAlpha.600" display={{ base: 'none', md: 'block' }}>
          {account.displayName}
        </Text>
      )}
    </HStack>
  )
}
