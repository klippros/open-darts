import { Box } from '@chakra-ui/react'

export interface SettingsDismissBackdropProps {
  onDismiss: () => void
}

/** Fullscreen click-catcher above page chrome; sits under the settings panel. */
export const SettingsDismissBackdrop = ({ onDismiss }: SettingsDismissBackdropProps) => (
  <Box
    position="fixed"
    inset={0}
    zIndex="toast"
    onClick={(event) => {
      event.preventDefault()
      event.stopPropagation()
      onDismiss()
    }}
  />
)
