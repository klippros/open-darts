import type { Account } from '../../types/account'

export const getPlayerDisplayName = (account: Account | null): string | null => {
  const name = account?.displayName.trim()
  return name === '' || name === undefined ? null : name
}
