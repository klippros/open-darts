import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CreateAccountInput } from '../types/account'
import {
  clearAccount,
  createAccountRecord,
  loadAccount,
  saveAccount,
  validateCreateAccountInput,
} from '../lib/storage/accountStore'
import { AccountContext } from './accountContext'

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState(() => loadAccount())

  const createAccount = useCallback((input: CreateAccountInput): string | null => {
    const validationError = validateCreateAccountInput(input)

    if (validationError !== null) {
      return validationError
    }

    const nextAccount = createAccountRecord(input)
    saveAccount(nextAccount)
    setAccount(nextAccount)
    return null
  }, [])

  const signOut = useCallback(() => {
    clearAccount()
    setAccount(null)
  }, [])

  const value = useMemo(
    () => ({
      account,
      createAccount,
      signOut,
    }),
    [account, createAccount, signOut],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
