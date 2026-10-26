/** Display face used for scores, pads, and scoring chrome. */
export const DISPLAY_FONT_FAMILY = 'Archivo Black, sans-serif' as const

/** Display type shared by score pads, slot labels, and scoring chrome. */
export const scoringDisplayFont = {
  fontFamily: DISPLAY_FONT_FAMILY,
  lineHeight: '1',
} as const

/** Large labels on visit-score pads and dart slot cards. */
export const scorePadTypeProps = {
  ...scoringDisplayFont,
  fontSize: '2xl',
} as const

/** Undo and similar scoring actions under the pad / slots. */
export const scoringActionTypeProps = {
  ...scoringDisplayFont,
  fontSize: 'lg',
} as const
