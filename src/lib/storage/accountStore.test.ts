import { describe, expect, it } from 'vitest'
import {
  clearAccount,
  createAccountRecord,
  loadAccount,
  saveAccount,
  validateCreateAccountInput,
} from './accountStore'
import type { StorageAdapter } from './localStorageAdapter'
import { StorageKey } from './storageKeys'

const createMemoryStorage = (): StorageAdapter & { data: Map<string, string> } => {
  const data = new Map<string, string>()

  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

describe('accountStore', () => {
  it('validates account input', () => {
    expect(validateCreateAccountInput({ displayName: '' })).toBe('Name is required.')
    expect(validateCreateAccountInput({ displayName: 'Alex', email: 'bad-email' })).toBe(
      'Enter a valid email address.',
    )
    expect(
      validateCreateAccountInput({ displayName: 'Alex', email: 'alex@example.com' }),
    ).toBeNull()
  })

  it('saves and loads an account', () => {
    const storage = createMemoryStorage()
    const account = createAccountRecord({
      displayName: 'Alex',
      email: 'alex@example.com',
    })

    saveAccount(account, storage)

    expect(loadAccount(storage)).toEqual(account)
  })

  it('clears the stored account', () => {
    const storage = createMemoryStorage()
    const account = createAccountRecord({ displayName: 'Alex' })

    saveAccount(account, storage)
    clearAccount(storage)

    expect(loadAccount(storage)).toBeNull()
    expect(storage.data.has(StorageKey.Account)).toBe(false)
  })

  it('ignores invalid stored account JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem(StorageKey.Account, '{"id":"only-id"}')

    expect(loadAccount(storage)).toBeNull()
  })
})
