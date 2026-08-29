import { useCallback, useMemo, useState } from 'react'
import { loadDevicePreferences, saveDevicePreferences } from './devicePreferences.js'
import { DeviceContext } from './deviceContext.js'

export function DeviceProvider({ children }) {
  const [preferences, setPreferences] = useState(loadDevicePreferences)
  const update = useCallback((patch) => {
    setPreferences((current) => {
      const next = { ...current, ...patch }
      saveDevicePreferences(next)
      return next
    })
  }, [])
  const selectProfile = useCallback((selectedProfileId) => update({ selectedProfileId }), [update])
  const applyServerDevice = useCallback((device) => update({
    mode: device?.mode || 'shared',
    boundProfileId: device?.boundProfileId || null,
    ...(device?.boundProfileId ? { selectedProfileId: device.boundProfileId } : {}),
  }), [update])
  const value = useMemo(() => ({ preferences, selectProfile, applyServerDevice, updatePreferences: update }), [applyServerDevice, preferences, selectProfile, update])
  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
}
