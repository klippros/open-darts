import { HStack, Link } from '@chakra-ui/react'
import { NavLink } from 'react-router-dom'

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
  fontWeight: isActive ? 600 : 400,
  fontSize: '1.125rem',
  textDecoration: 'none',
  transition: 'color 0.15s ease',
})

export const AppNavbar = () => (
  <HStack as="nav" gap={6} flexShrink={0} aria-label="Main">
    <Link asChild>
      <NavLink to="/" end style={navLinkStyle}>
        Play
      </NavLink>
    </Link>
    <Link asChild>
      <NavLink to="/about" style={navLinkStyle}>
        About
      </NavLink>
    </Link>
  </HStack>
)
