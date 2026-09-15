import { cloneElement } from 'react'
import { Box } from '@chakra-ui/react'
import { faCompress, faExpand } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useGameChrome } from '../../hooks/gameChromeContext'
import { useFullscreen } from '../../hooks/useFullscreen'
import { createToolbarIconButton } from '../AppHeader/toolbarButtons'

/** Fullscreen toggle available only while a match is active. */
export const GameFullscreenControl = () => {
  const gameChrome = useGameChrome()
  const { isFullscreen, isSupported, toggle } = useFullscreen()

  if (gameChrome?.active !== true || !isSupported) {
    return null
  }

  return (
    <Box>
      {cloneElement(
        createToolbarIconButton(
          isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen',
          <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />,
        ),
        { onClick: () => void toggle() },
      )}
    </Box>
  )
}
