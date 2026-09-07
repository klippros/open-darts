export const formatOneTwentyOneLivesAriaLabel = (lives: number): string => {
  const count = Math.max(0, lives)

  return `${count} live${count === 1 ? '' : 's'}`
}
