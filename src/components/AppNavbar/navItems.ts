export interface NavItemConfig {
  to: string
  label: string
  beta?: boolean
}

export const NAV_ITEMS: readonly NavItemConfig[] = [
  { to: '/', label: 'Play' },
  { to: '/history', label: 'History' },
  { to: '/stats', label: 'Stats' },
  { to: '/about', label: 'About' },
]
