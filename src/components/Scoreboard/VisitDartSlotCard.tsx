import { Box, Button, Text } from '@chakra-ui/react'
import { faArrowRightLong } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export type VisitDartSlotCardVariant = 'thrown' | 'selectable' | 'empty' | 'used'
export type VisitDartSlotCardTone = 'neutral' | 'red' | 'green'

const ArrowMark = () => (
  <Box aria-hidden="true" w="full" color="whiteAlpha.600" lineHeight={0}>
    <FontAwesomeIcon icon={faArrowRightLong} style={{ width: '100%', height: '1.1em' }} />
  </Box>
)

const VARIANT_STYLES: Record<
  VisitDartSlotCardVariant,
  { borderColor: string; bg: string; opacity: number }
> = {
  thrown: {
    borderColor: 'whiteAlpha.500',
    bg: 'whiteAlpha.200',
    opacity: 1,
  },
  selectable: {
    borderColor: 'whiteAlpha.400',
    bg: 'whiteAlpha.100',
    opacity: 1,
  },
  used: {
    borderColor: 'whiteAlpha.300',
    bg: 'whiteAlpha.50',
    opacity: 0.6,
  },
  empty: {
    borderColor: 'whiteAlpha.200',
    bg: 'whiteAlpha.50',
    opacity: 0.35,
  },
}

const TONE_STYLES: Record<
  Exclude<VisitDartSlotCardTone, 'neutral'>,
  { borderColor: string; color: string; hoverBorderColor: string }
> = {
  red: {
    borderColor: 'red.400',
    color: 'red.200',
    hoverBorderColor: 'red.300',
  },
  green: {
    borderColor: 'green.400',
    color: 'green.200',
    hoverBorderColor: 'green.300',
  },
}

const getVariantStyles = (variant: VisitDartSlotCardVariant) => VARIANT_STYLES[variant]

export interface VisitDartSlotCardProps {
  label: string | null
  variant: VisitDartSlotCardVariant
  tone?: VisitDartSlotCardTone
  size?: 'default' | 'comfortable'
  showArrow?: boolean
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
}

export const VisitDartSlotCard = ({
  label,
  variant,
  tone = 'neutral',
  size = 'default',
  showArrow = true,
  onClick,
  disabled = false,
  ariaLabel,
}: VisitDartSlotCardProps) => {
  const styles = getVariantStyles(variant)
  const toneStyles = tone === 'neutral' ? null : TONE_STYLES[tone]
  const isInteractive = onClick !== undefined && !disabled && variant === 'selectable'
  const isComfortable = size === 'comfortable'
  const labelColor = toneStyles?.color ?? 'white'
  const borderColor = toneStyles?.borderColor ?? styles.borderColor

  const slotContent = (
    <>
      {showArrow ? <ArrowMark /> : null}
      <Text
        mt={showArrow ? 2 : 0}
        color={labelColor}
        fontFamily="Archivo Black, sans-serif"
        fontSize="2xl"
        lineHeight="1"
        whiteSpace="pre-line"
      >
        {label ?? '—'}
      </Text>
    </>
  )

  const slotStyles = {
    px: 3,
    py: isComfortable ? 14 : 4,
    minH: isComfortable ? '13rem' : undefined,
    borderRadius: '14px',
    borderWidth: '1px',
    borderColor,
    bg: styles.bg,
    opacity: styles.opacity,
    textAlign: 'center' as const,
    w: 'full',
    h: 'auto',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
        fontWeight="normal"
        whiteSpace="normal"
        {...slotStyles}
        _hover={{
          borderColor: toneStyles?.hoverBorderColor ?? 'orange.300',
          bg: toneStyles === null ? 'whiteAlpha.200' : 'transparent',
          transform: 'scale(1.02)',
        }}
        _active={{ bg: 'transparent', transform: 'scale(0.98)' }}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: toneStyles?.hoverBorderColor ?? 'orange.300',
          outlineOffset: '2px',
        }}
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
