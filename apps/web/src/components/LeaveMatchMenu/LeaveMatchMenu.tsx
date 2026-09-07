import { useState } from 'react'
import { Button, Popover, Portal, Stack } from '@chakra-ui/react'
import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createToolbarIconButton } from '../AppHeader/toolbarButtons'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { SettingsDismissBackdrop } from '../SettingsMenu/SettingsDismissBackdrop'

export interface LeaveMatchMenuProps {
  canFinish: boolean
  onAbort: () => void
  onFinish: () => void
}

export const LeaveMatchMenu = ({ canFinish, onAbort, onFinish }: LeaveMatchMenuProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root
      open={open}
      positioning={{ placement: 'bottom-start' }}
      onOpenChange={(details) => {
        setOpen(details.open)
      }}
    >
      <Popover.Trigger asChild>
        {createToolbarIconButton('Leave match', <FontAwesomeIcon icon={faArrowRightFromBracket} />)}
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
                Match
              </Popover.Title>
            </Popover.Header>
            <Popover.Body px={4} py={3}>
              <Stack gap={2}>
                <Button
                  variant="cancel"
                  w="full"
                  justifyContent="flex-start"
                  onClick={() => {
                    setOpen(false)
                    onAbort()
                  }}
                >
                  Abort match
                </Button>
                <Button
                  variant="emphasis"
                  w="full"
                  justifyContent="flex-start"
                  disabled={!canFinish}
                  onClick={() => {
                    setOpen(false)
                    onFinish()
                  }}
                >
                  Finish
                </Button>
              </Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
