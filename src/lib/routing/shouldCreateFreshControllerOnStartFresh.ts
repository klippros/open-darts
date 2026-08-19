export interface RouteSyncState {
  routeKey: string
  startFresh: boolean
}

export const shouldCreateFreshControllerOnStartFresh = (
  previous: RouteSyncState | null,
  routeKey: string,
): boolean => previous !== null && previous.routeKey !== routeKey
