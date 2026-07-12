export interface CheckoutDart {
  label: string
  points: number
}

export const checkoutDartFromLabel = (label: string): CheckoutDart => {
  if (label === 'Bull') {
    return { label: 'Bull', points: 50 }
  }

  if (label === '25') {
    return { label: '25', points: 25 }
  }

  if (label.startsWith('T')) {
    const value = Number(label.slice(1))

    return { label, points: value * 3 }
  }

  if (label.startsWith('D')) {
    const value = Number(label.slice(1))

    return { label, points: value * 2 }
  }

  const value = Number(label)

  return { label, points: value }
}
