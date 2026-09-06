export enum SingleDartScoringMode {
  Always = 'always',
  Sub171 = 'sub-171',
  Never = 'never',
}

export interface AppSettings {
  scoreCallerEnabled: boolean
  uiSoundsEnabled: boolean
  singleDartScoring: SingleDartScoringMode
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  scoreCallerEnabled: true,
  uiSoundsEnabled: true,
  singleDartScoring: SingleDartScoringMode.Sub171,
}
