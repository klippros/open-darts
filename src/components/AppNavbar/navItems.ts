export interface NavItemConfig {
  to: string
  label: string
  beta?: boolean
}

export const NAV_ITEMS: readonly NavItemConfig[] = [
  { to: '/', label: 'Play' },
  { to: '/history', label: 'History', beta: true },
  { to: '/stats', label: 'Stats', beta: true },
  { to: '/about', label: 'About' },
]
