import { SyncStatus } from '../../types/auth'

export const getSyncStatusLabel = (syncStatus: SyncStatus): string => {
  if (syncStatus === SyncStatus.Error) {
    return 'Saved locally. Cloud sync will retry.'
  }

  if (syncStatus === SyncStatus.Syncing) {
    return 'Syncing completed games…'
  }

  if (syncStatus === SyncStatus.Synced) {
    return 'Completed games are saved across devices.'
  }

  return 'Signed in'
}
