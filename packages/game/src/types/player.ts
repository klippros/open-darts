export enum PlayerKind {
  Human = 'human',
  Remote = 'remote',
}

export interface Player {
  id: string
  name: string
  kind: PlayerKind
}
