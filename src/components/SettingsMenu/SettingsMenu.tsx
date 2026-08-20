import { useState } from 'react'
import type { ReactElement } from 'react'
import { Popover, Portal } from '@chakra-ui/react'
import { faGear } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createToolbarIconButton } from '../AppHeader/toolbarButtons'
import { darkDialogContentProps } from '../darkDialogContentProps'
import { SettingsDismissBackdrop } from './SettingsDismissBackdrop'
import { SettingsPopoverContent } from './SettingsPopoverContent'

const defaultPositioning = { placement: 'bottom-end' as const }

export interface SettingsMenuProps {
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  positioning?: { placement?: 'bottom-end' | 'bottom-start' }
}

export const SettingsMenu = ({
  trigger,
  open: openProp,
  onOpenChange,
  positioning = defaultPositioning,
}: SettingsMenuProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : uncontrolledOpen

  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  return (
    <Popover.Root
      open={open}
      positioning={positioning}
      onOpenChange={(details) => {
        setOpen(details.open)
      }}
    >
      <Popover.Trigger asChild>
        {trigger ?? createToolbarIconButton('Settings', <FontAwesomeIcon icon={faGear} />)}
      </Popover.Trigger>
      <Portal>
        {open && (
          <SettingsDismissBackdrop
            onDismiss={() => {
              setOpen(false)
            }}
          />
        )}
        <Popover.Positioner zIndex="tooltip">
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
                Settings
              </Popover.Title>
            </Popover.Header>
            <Popover.Body px={4} py={3}>
              <SettingsPopoverContent />
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
