import { useState } from 'react'
import { Button, Popover, Portal, Text } from '@chakra-ui/react'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { darkDialogContentProps } from '../darkDialogContentProps'

const HINT_COPY =
  'Track every dart on a double as a single dart to get your checkout percentage. A visit total from 170 down can hide those darts. Set Single dart scoring to Sub 171 and they are logged for you.'

export const CheckoutTrackingHint = () => {
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
        <Button
          aria-label="How to track checkout percentage"
          variant="ghost"
          color="whiteAlpha.700"
          minW={6}
          w={6}
          h={6}
          p={0}
          flexShrink={0}
          onClick={(event) => {
            event.stopPropagation()
          }}
          onKeyDown={(event) => {
            event.stopPropagation()
          }}
          _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
          _expanded={{ color: 'white', bg: 'whiteAlpha.100' }}
        >
          <FontAwesomeIcon icon={faCircleInfo} />
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner css={{ '--z-index': 'zIndex.popover' }}>
          <Popover.Content
            bg={darkDialogContentProps.bg}
            borderWidth={darkDialogContentProps.borderWidth}
            borderColor={darkDialogContentProps.borderColor}
            color={darkDialogContentProps.color}
            borderRadius="xl"
            shadow="2xl"
            maxW="18rem"
            overflow="hidden"
            p={0}
            _focusVisible={{ outline: 'none' }}
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <Popover.Body px={4} py={3}>
              <Text fontSize="sm" color="whiteAlpha.900" lineHeight="1.55">
                {HINT_COPY}
              </Text>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
