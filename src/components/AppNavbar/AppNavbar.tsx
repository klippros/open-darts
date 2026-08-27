import { Button, HStack } from '@chakra-ui/react'
import { useState } from 'react'
import { useAuth } from '../../hooks/authContext'
import { SignInDialog } from '../SignInDialog/SignInDialog'
import { UserAccountMenu } from '../UserAccountMenu/UserAccountMenu'
import { NAV_ITEMS } from './navItems'
import { NavItem } from './NavItem'

export const AppNavbar = () => {
  const { user, isConfigured } = useAuth()
  const [signInDialogOpen, setSignInDialogOpen] = useState(false)

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
      {user !== null && <UserAccountMenu />}
      {isConfigured && user === null && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setSignInDialogOpen(true)
          }}
        >
          Sign in
        </Button>
      )}
      <SignInDialog open={signInDialogOpen} onOpenChange={setSignInDialogOpen} />
    </HStack>
  )
}
