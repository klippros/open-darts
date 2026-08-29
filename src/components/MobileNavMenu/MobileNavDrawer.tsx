import { Box, Button, Drawer, Flex, Portal, VStack } from '@chakra-ui/react'
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import { useAuth } from '../../hooks/authContext'
import { toolbarControlSize } from '../../layout'
import { createSettingsNavButton } from '../AppHeader/toolbarButtons'
import { NavItem } from '../AppNavbar/NavItem'
import { NAV_ITEMS } from '../AppNavbar/navItems'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { SettingsMenu } from '../SettingsMenu/SettingsMenu'
import { SignInDialog } from '../SignInDialog/SignInDialog'
import { SignOutConfirmDialog } from '../SignOutConfirmDialog/SignOutConfirmDialog'

export interface MobileNavDrawerProps {
  settingsOpen: boolean
  onSettingsOpenChange: (open: boolean) => void
  onNavigate: () => void
}

export const MobileNavDrawer = ({
  settingsOpen,
  onSettingsOpenChange,
  onNavigate,
}: MobileNavDrawerProps) => {
  const { user, profile, isConfigured, signOut } = useAuth()
  const [signInDialogOpen, setSignInDialogOpen] = useState(false)
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)
  const playerName = user === null ? null : (profile?.displayName ?? user.email ?? 'Signed in')

  return (
    <Portal>
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content
          position="relative"
          bg={darkDialogContentProps.bg}
          borderWidth={darkDialogContentProps.borderWidth}
          borderColor={darkDialogContentProps.borderColor}
          color={darkDialogContentProps.color}
          shadow={darkDialogContentProps.shadow}
          maxW="280px"
          aria-label={playerName ?? 'Menu'}
        >
          {playerName !== null && (
            <Drawer.Header px={4} py={3} borderBottomWidth="1px" borderColor="whiteAlpha.100">
              <Flex align="center" justify="space-between" gap={3} width="full">
                <Drawer.Title
                  fontSize="sm"
                  fontWeight="semibold"
                  color="whiteAlpha.900"
                  flex="1"
                  minW={0}
                  truncate
                >
                  {playerName}
                </Drawer.Title>
                <Button
                  aria-label="Sign out"
                  variant="ghost"
                  color="whiteAlpha.800"
                  minW={toolbarControlSize}
                  w={toolbarControlSize}
                  h={toolbarControlSize}
                  p={0}
                  flexShrink={0}
                  _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                  onClick={() => {
                    setSignOutDialogOpen(true)
                  }}
                >
                  <FontAwesomeIcon icon={faRightFromBracket} />
                </Button>
              </Flex>
            </Drawer.Header>
          )}
          <Drawer.Body px={4} py={4}>
            <VStack as="nav" align="stretch" gap={4} aria-label="Main">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  beta={item.beta}
                  onNavigate={onNavigate}
                />
              ))}
              <SettingsMenu
                open={settingsOpen}
                onOpenChange={onSettingsOpenChange}
                positioning={{ placement: 'bottom-start' }}
                trigger={createSettingsNavButton()}
              />
              {isConfigured && user === null && (
                <Button
                  variant="cta"
                  onClick={() => {
                    setSignInDialogOpen(true)
                  }}
                >
                  Sign in to sync
                </Button>
              )}
            </VStack>
          </Drawer.Body>
          <SignInDialog open={signInDialogOpen} onOpenChange={setSignInDialogOpen} />
          <SignOutConfirmDialog
            open={signOutDialogOpen}
            onOpenChange={setSignOutDialogOpen}
            onConfirm={() => {
              setSignOutDialogOpen(false)
              onNavigate()
              void signOut()
            }}
          />
          {/* Covers drawer chrome; portaled settings backdrop cannot sit above this panel. */}
          {settingsOpen && (
            <Box
              position="absolute"
              inset={0}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onSettingsOpenChange(false)
              }}
            />
          )}
        </Drawer.Content>
      </Drawer.Positioner>
    </Portal>
  )
}
