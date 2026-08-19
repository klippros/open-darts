export const formatOneTwentyOneLives = (lives: number): string => '❤️'.repeat(Math.max(0, lives))

export const formatOneTwentyOneLivesAriaLabel = (lives: number): string =>
  `${Math.max(0, lives)} live${lives === 1 ? '' : 's'}`
