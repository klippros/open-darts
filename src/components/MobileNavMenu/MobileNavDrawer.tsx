import { Box, Drawer, Portal, VStack } from '@chakra-ui/react'
import { useAccount } from '../../hooks/accountContext'
import { getPlayerDisplayName } from '../../lib/account/getPlayerDisplayName'
import { createSettingsNavButton } from '../AppHeader/toolbarButtons'
import { NavItem } from '../AppNavbar/NavItem'
import { NAV_ITEMS } from '../AppNavbar/navItems'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { SettingsMenu } from '../SettingsMenu/SettingsMenu'

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
  const { account } = useAccount()
  const playerName = getPlayerDisplayName(account)

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
              <Drawer.Title fontSize="sm" fontWeight="semibold" color="whiteAlpha.900">
                {playerName}
              </Drawer.Title>
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
            </VStack>
          </Drawer.Body>
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
