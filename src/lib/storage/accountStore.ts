import type { Account, CreateAccountInput } from '../../types/account'
import type { StorageAdapter } from './localStorageAdapter'
import { browserLocalStorage } from './localStorageAdapter'
import { StorageKey } from './storageKeys'

const parseJson = (value: string | null): unknown => {
  if (value === null) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const isAccount = (value: unknown): value is Account => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const account = value as Partial<Account>

  return (
    typeof account.id === 'string' &&
    typeof account.displayName === 'string' &&
    typeof account.createdAt === 'string' &&
    (account.email === undefined || typeof account.email === 'string')
  )
}

export const validateCreateAccountInput = (input: CreateAccountInput): string | null => {
  if (input.displayName.trim() === '') {
    return 'Name is required.'
  }

  const email = input.email?.trim()

  if (email !== undefined && email !== '' && !email.includes('@')) {
    return 'Enter a valid email address.'
  }

  return null
}

export const createAccountRecord = (input: CreateAccountInput): Account => {
  const email = input.email?.trim()

  return {
    id: crypto.randomUUID(),
    displayName: input.displayName.trim(),
    email: email === '' ? undefined : email,
    createdAt: new Date().toISOString(),
  }
}

export const loadAccount = (storage: StorageAdapter = browserLocalStorage): Account | null => {
  const parsed = parseJson(storage.getItem(StorageKey.Account))

  if (parsed === null || !isAccount(parsed)) {
    return null
  }

  return parsed
}

export const saveAccount = (
  account: Account,
  storage: StorageAdapter = browserLocalStorage,
): void => {
  storage.setItem(StorageKey.Account, JSON.stringify(account))
}

export const clearAccount = (storage: StorageAdapter = browserLocalStorage): void => {
  storage.removeItem(StorageKey.Account)
}
