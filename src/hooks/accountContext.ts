import { createContext, useContext } from 'react'
import type { Account, CreateAccountInput } from '../types/account'

export interface AccountContextValue {
  account: Account | null
  createAccount: (input: CreateAccountInput) => string | null
  signOut: () => void
}

export const AccountContext = createContext<AccountContextValue | null>(null)

export const useAccount = (): AccountContextValue => {
  const value = useContext(AccountContext)

  if (value === null) {
    throw new Error('useAccount must be used within AccountProvider')
  }

  return value
}
