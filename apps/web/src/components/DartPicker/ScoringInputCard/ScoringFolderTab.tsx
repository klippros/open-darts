import { Button } from '@chakra-ui/react'

export interface ScoringFolderTabProps {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}

/** Matches `html` in theme.ts so the seam cover blends with the page. */
const pageBackground = {
  bgColor: '#000000',
  bgImage: 'radial-gradient(circle at top, #111136, #000000)',
  bgAttachment: 'fixed' as const,
}

export const ScoringFolderTab = ({
  label,
  active,
  disabled = false,
  onClick,
}: ScoringFolderTabProps) => {
  let labelColor = 'whiteAlpha.500'
  if (disabled) {
    labelColor = 'whiteAlpha.400'
  } else if (active) {
    labelColor = 'white'
  }

  return (
    <Button
      type="button"
      variant="plain"
      size="sm"
      h="8"
      minW={0}
      px={3}
      mb="-1px"
      fontSize="sm"
      fontWeight={active ? 'semibold' : 'normal'}
      color={labelColor}
      bg="transparent"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderBottomWidth={0}
      borderBottomRadius={0}
      borderTopRadius="md"
      position="relative"
      zIndex={active ? 2 : 0}
      opacity={active ? 1 : 0.65}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      _hover={{
        bg: 'transparent',
        color: disabled ? 'whiteAlpha.400' : 'white',
        opacity: disabled ? undefined : 1,
      }}
      _after={
        active
          ? {
              content: '""',
              position: 'absolute',
              left: '1px',
              right: '1px',
              bottom: '-2px',
              height: '3px',
              ...pageBackground,
              zIndex: 1,
            }
          : undefined
      }
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
