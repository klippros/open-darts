import { HStack, Text } from '@chakra-ui/react'
import { useAccount } from '../../hooks/accountContext'
import { getPlayerDisplayName } from '../../lib/account/getPlayerDisplayName'
import { NAV_ITEMS } from './navItems'
import { NavItem } from './NavItem'

export const AppNavbar = () => {
  const { account } = useAccount()
  const playerName = getPlayerDisplayName(account)

  return (
    <HStack
      as="nav"
      gap={6}
      flexShrink={0}
      aria-label="Main"
      display={{ base: 'none', md: 'flex' }}
    >
      {NAV_ITEMS.map((item) => (
        <NavItem key={item.to} to={item.to} label={item.label} beta={item.beta} />
      ))}
      {playerName !== null && (
        <Text fontSize="sm" color="whiteAlpha.600">
          {playerName}
        </Text>
      )}
    </HStack>
  )
}
