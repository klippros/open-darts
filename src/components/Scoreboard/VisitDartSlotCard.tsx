import { Box, Button, Text } from '@chakra-ui/react'
import { faArrowRightLong } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export type VisitDartSlotCardVariant = 'thrown' | 'selectable' | 'empty' | 'used'

const ArrowMark = () => (
  <Box aria-hidden="true" w="full" color="whiteAlpha.600" lineHeight={0}>
    <FontAwesomeIcon icon={faArrowRightLong} style={{ width: '100%', height: '1.1em' }} />
  </Box>
)

const getVariantStyles = (variant: VisitDartSlotCardVariant) => {
  switch (variant) {
    case 'thrown':
      return {
        borderColor: 'whiteAlpha.500',
        bg: 'whiteAlpha.200',
        opacity: 1,
      }
    case 'selectable':
      return {
        borderColor: 'whiteAlpha.400',
        bg: 'whiteAlpha.100',
        opacity: 1,
      }
    case 'used':
      return {
        borderColor: 'whiteAlpha.300',
        bg: 'whiteAlpha.50',
        opacity: 0.6,
      }
    case 'empty':
      return {
        borderColor: 'whiteAlpha.200',
        bg: 'whiteAlpha.50',
        opacity: 0.35,
      }
  }
}

export interface VisitDartSlotCardProps {
  label: string | null
  variant: VisitDartSlotCardVariant
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
}

export const VisitDartSlotCard = ({
  label,
  variant,
  onClick,
  disabled = false,
  ariaLabel,
}: VisitDartSlotCardProps) => {
  const styles = getVariantStyles(variant)
  const isInteractive = onClick !== undefined && !disabled && variant === 'selectable'

  const slotContent = (
    <>
      <ArrowMark />
      <Text
        mt={2}
        color="white"
        fontFamily="Archivo Black, sans-serif"
        fontSize="2xl"
        lineHeight="1"
      >
        {label ?? '—'}
      </Text>
    </>
  )

  const slotStyles = {
    px: 3,
    py: 4,
    borderRadius: '14px',
    borderWidth: '1px',
    borderColor: styles.borderColor,
    bg: styles.bg,
    opacity: styles.opacity,
    textAlign: 'center' as const,
    w: 'full',
    transition: 'border-color 0.15s ease, background 0.15s ease, transform 0.15s ease',
  }

  if (isInteractive) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        h="auto"
        display="block"
        fontWeight="normal"
        whiteSpace="normal"
        {...slotStyles}
        _hover={{
          borderColor: 'orange.300',
          bg: 'whiteAlpha.200',
          transform: 'scale(1.02)',
        }}
        _active={{ transform: 'scale(0.98)' }}
        _focusVisible={{ outline: '2px solid', outlineColor: 'orange.300', outlineOffset: '2px' }}
      >
        {slotContent}
      </Button>
    )
  }

  return (
    <Box cursor="default" {...slotStyles}>
      {slotContent}
    </Box>
  )
}
