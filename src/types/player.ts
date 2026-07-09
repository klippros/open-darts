export enum PlayerKind {
  Human = 'human',
  Bot = 'bot',
  Remote = 'remote',
}

export interface Player {
  id: string
  name: string
  kind: PlayerKind
}
