import { createSystem, defaultConfig, defineConfig, defineRecipe } from '@chakra-ui/react'

/**
 * Hover may enlarge the whole button (visible chrome scale).
 * Never shrink on :active here — that moves the hit target under a finger and
 * drops taps. Press shrink lives on an inner layer (PressScaleButton).
 */
const pressMotion = {
  transform: 'scale(1)',
  transitionProperty: 'transform, background-color, border-color',
  transitionDuration: '0.15s',
  _hover: { transform: 'scale(1.03)' },
}

const buttonRecipe = defineRecipe({
  variants: {
    variant: {
      cancel: {
        ...pressMotion,
        bg: 'transparent',
        color: 'white',
        borderWidth: '1px',
        borderColor: 'whiteAlpha.600',
        _hover: {
          ...pressMotion._hover,
          bg: 'whiteAlpha.100',
          borderColor: 'whiteAlpha.800',
        },
        _active: {
          bg: 'whiteAlpha.150',
        },
      },
      emphasis: {
        ...pressMotion,
        bg: 'white',
        color: 'black',
        borderColor: 'transparent',
        _hover: {
          ...pressMotion._hover,
          bg: 'whiteAlpha.900',
        },
        _active: {
          bg: 'whiteAlpha.800',
        },
      },
      cta: {
        ...pressMotion,
        borderRadius: '12px',
        bg: 'transparent',
        color: 'white',
        borderWidth: '1px',
        borderColor: 'whiteAlpha.600',
        _hover: {
          ...pressMotion._hover,
          bg: 'transparent',
          borderColor: 'whiteAlpha.800',
        },
        _active: {
          bg: 'transparent',
        },
      },
      destructive: {
        ...pressMotion,
        bg: 'red.500',
        color: 'white',
        borderColor: 'transparent',
        _hover: {
          ...pressMotion._hover,
          bg: 'red.600',
        },
      },
    },
  },
})

const config = defineConfig({
  globalCss: {
    html: {
      color: 'fg',
      backgroundColor: '#000000',
      backgroundImage: 'radial-gradient(circle at top, #111136, #000000)',
      backgroundAttachment: 'fixed',
      lineHeight: '1.5',
      colorPalette: 'gray',
    },
    body: {
      color: 'fg',
      bg: 'transparent',
    },
    '#root': {
      bg: 'transparent',
    },
  },
  theme: {
    recipes: {
      button: buttonRecipe,
    },
  },
})

export const system = createSystem(defaultConfig, config)
