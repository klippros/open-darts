import { cloneElement, useState } from 'react'
import { Box, Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { DartPickerHelpContent } from '../../lib/game/getGameModePickerTargets'
import { createToolbarIconButton } from '../AppHeader/toolbarButtons'
import { darkDialogContentProps } from '../darkDialogContentProps'

export const DartPickerHelp = ({ title, paragraphs }: DartPickerHelpContent) => {
  const [open, setOpen] = useState(false)

  const openHelp = () => {
    setOpen(true)
  }

  return (
    <Box>
      {cloneElement(
        createToolbarIconButton(`${title} help`, <FontAwesomeIcon icon={faCircleInfo} />),
        { onClick: openHelp },
      )}
      <Dialog.Root
        open={open}
        placement="center"
        onOpenChange={(details) => {
          setOpen(details.open)
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              bg={darkDialogContentProps.bg}
              borderWidth={darkDialogContentProps.borderWidth}
              borderColor={darkDialogContentProps.borderColor}
              color={darkDialogContentProps.color}
              shadow={darkDialogContentProps.shadow}
              maxW="md"
            >
              <Dialog.Header>
                <Dialog.Title color="white">{title}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap={3} fontSize="sm" color="whiteAlpha.900" lineHeight="1.55">
                  {paragraphs.map((paragraph) => (
                    <Text key={paragraph}>{paragraph}</Text>
                  ))}
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="cancel">Close</Button>
                </Dialog.ActionTrigger>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}
