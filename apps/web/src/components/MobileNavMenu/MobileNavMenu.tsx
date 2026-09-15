import { useState } from 'react'
import { Box, Drawer } from '@chakra-ui/react'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createToolbarIconButton } from '../AppHeader/toolbarButtons'
import { MobileNavDrawer } from './MobileNavDrawer'

export const MobileNavMenu = () => {
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const closeMenu = () => {
    setSettingsOpen(false)
    setOpen(false)
  }

  return (
    <Box display={{ base: 'flex', md: 'none' }}>
      <Drawer.Root
        open={open}
        placement="end"
        onOpenChange={(details) => {
          setOpen(details.open)
          if (!details.open) {
            setSettingsOpen(false)
          }
        }}
        onInteractOutside={(event) => {
          if (settingsOpen) {
            event.preventDefault()
          }
        }}
      >
        <Drawer.Trigger asChild>
          {createToolbarIconButton('Open menu', <FontAwesomeIcon icon={faBars} />)}
        </Drawer.Trigger>
        <MobileNavDrawer
          settingsOpen={settingsOpen}
          onSettingsOpenChange={setSettingsOpen}
          onNavigate={closeMenu}
        />
      </Drawer.Root>
    </Box>
  )
}
