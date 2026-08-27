export enum X01InputMode {
  Board = 'board',
  VisitScore = 'visit-score',
}

export interface AppSettings {
  scoreCallerEnabled: boolean
  uiSoundsEnabled: boolean
  x01InputMode: X01InputMode
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  scoreCallerEnabled: true,
  uiSoundsEnabled: true,
  x01InputMode: X01InputMode.Board,
}
