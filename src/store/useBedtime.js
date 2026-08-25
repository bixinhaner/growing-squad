import { useContext } from 'react'
import { BedtimeActionsContext, BedtimeStateContext } from './contexts.js'

export function useBedtimeState() {
  const value = useContext(BedtimeStateContext)
  if (!value) throw new Error('useBedtimeState must be used inside BedtimeProvider')
  return value
}

export function useBedtimeActions() {
  const value = useContext(BedtimeActionsContext)
  if (!value) throw new Error('useBedtimeActions must be used inside BedtimeProvider')
  return value
}
