import { HStack, Link, Text } from '@chakra-ui/react'
import { NavLink } from 'react-router-dom'
import { BetaBadge } from '../BetaBadge/BetaBadge'
import type { NavItemConfig } from './navItems'

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
  fontWeight: isActive ? 600 : 400,
  fontSize: '1.125rem',
  textDecoration: 'none',
  transition: 'color 0.15s ease',
})

export type NavItemProps = NavItemConfig & {
  onNavigate?: () => void
}

export const NavItem = ({ to, label, beta = false, onNavigate }: NavItemProps) => (
  <Link asChild>
    <NavLink
      to={to}
      end={to === '/'}
      style={navLinkStyle}
      onClick={() => {
        onNavigate?.()
      }}
    >
      <HStack as="span" gap={2} display="inline-flex" alignItems="center">
        <Text as="span">{label}</Text>
        {beta && <BetaBadge />}
      </HStack>
    </NavLink>
  </Link>
)
