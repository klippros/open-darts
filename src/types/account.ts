export interface Account {
  id: string
  displayName: string
  email?: string
  createdAt: string
}

export interface CreateAccountInput {
  displayName: string
  email?: string
}
