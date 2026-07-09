import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useX01Game } from './useX01Game'
import { parseX01ConfigFromSearchParams } from '../lib/x01/x01Presets'

export const useX01GameFromRoute = () => {
  const [searchParams] = useSearchParams()
  const config = useMemo(() => parseX01ConfigFromSearchParams(searchParams), [searchParams])

  return useX01Game(config)
}
