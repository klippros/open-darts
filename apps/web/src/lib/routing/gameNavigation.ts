export interface GameNavigationState {
  explicitLaunch?: boolean
}

export const explicitGameLaunchState = (): GameNavigationState => ({
  explicitLaunch: true,
})

export const isExplicitGameLaunch = (state: unknown): boolean =>
  typeof state === 'object' &&
  state !== null &&
  (state as GameNavigationState).explicitLaunch === true
