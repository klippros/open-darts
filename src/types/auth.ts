import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  userId: string
  displayName: string
}

export enum AuthStatus {
  Loading = 'loading',
  Anonymous = 'anonymous',
  Authenticated = 'authenticated',
}

export enum SyncStatus {
  Idle = 'idle',
  Syncing = 'syncing',
  Synced = 'synced',
  Error = 'error',
}

export interface AuthState {
  user: User | null
  profile: UserProfile | null
  authStatus: AuthStatus
  syncStatus: SyncStatus
}
