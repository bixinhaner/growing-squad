import { createContext, useContext } from 'react'

export const DeviceContext = createContext(null)

export function useDevice() {
  const value = useContext(DeviceContext)
  if (!value) throw new Error('useDevice must be used inside DeviceProvider')
  return value
}

