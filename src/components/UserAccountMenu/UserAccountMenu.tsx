import { Button, Popover, Portal, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useAuth } from '../../hooks/authContext'
import { getSyncStatusLabel } from '../../lib/auth/syncStatusLabel'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { SettingsDismissBackdrop } from '../SettingsMenu/SettingsDismissBackdrop'
import { SignOutConfirmDialog } from '../SignOutConfirmDialog/SignOutConfirmDialog'

export const UserAccountMenu = () => {
  const { user, profile, syncStatus, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)

  if (user === null) {
    return null
  }

  const displayName = profile?.displayName ?? user.email ?? 'Signed in'
  const email = user.email

  const handleSignOutConfirm = () => {
    setSignOutDialogOpen(false)
    setOpen(false)
    void signOut()
  }

  return (
    <>
      <Popover.Root
        open={open}
        positioning={{ placement: 'bottom-end' }}
        onOpenChange={(details) => {
          setOpen(details.open)
        }}
      >
        <Popover.Trigger asChild>
          <Button
            size="sm"
            variant="ghost"
            color="whiteAlpha.700"
            fontWeight={400}
            _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
            _expanded={{ color: 'white', bg: 'whiteAlpha.100' }}
          >
            {displayName}
          </Button>
        </Popover.Trigger>
        <Portal>
          {open && (
            <SettingsDismissBackdrop
              onDismiss={() => {
                setOpen(false)
              }}
            />
          )}
          <Popover.Positioner css={{ '--z-index': 'zIndex.popover' }}>
            <Popover.Content
              bg={darkDialogContentProps.bg}
              borderWidth={darkDialogContentProps.borderWidth}
              borderColor={darkDialogContentProps.borderColor}
              color={darkDialogContentProps.color}
              borderRadius="xl"
              shadow="2xl"
              minW="280px"
              overflow="hidden"
              p={0}
              _focusVisible={{ outline: 'none' }}
            >
              <Popover.Header px={4} py={3} borderBottomWidth="1px" borderColor="whiteAlpha.100">
                <Popover.Title fontSize="sm" fontWeight="semibold" color="whiteAlpha.900">
                  Account
                </Popover.Title>
              </Popover.Header>
              <Popover.Body px={4} py={4}>
                <Stack gap={4}>
                  <Stack gap={1}>
                    <Text fontWeight="semibold" color="white">
                      {displayName}
                    </Text>
                    {email !== undefined && email !== '' && (
                      <Text fontSize="sm" color="whiteAlpha.700">
                        {email}
                      </Text>
                    )}
                    <Text fontSize="sm" color="whiteAlpha.700">
                      {getSyncStatusLabel(syncStatus)}
                    </Text>
                  </Stack>
                  <Button
                    variant="cancel"
                    w="full"
                    onClick={() => {
                      setSignOutDialogOpen(true)
                    }}
                  >
                    Sign out
                  </Button>
                </Stack>
              </Popover.Body>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
      <SignOutConfirmDialog
        open={signOutDialogOpen}
        onOpenChange={setSignOutDialogOpen}
        onConfirm={handleSignOutConfirm}
      />
    </>
  )
}
