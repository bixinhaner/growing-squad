const DEVICE_PREFERENCES_KEY = 'growing-squad:device-preferences:v1'

const defaults = {
  selectedProfileId: null,
  mode: 'shared',
  boundProfileId: null,
  lastRouteByProfile: {},
  reduceNetwork: false,
  dismissedNotices: [],
}

export function loadDevicePreferences() {
  if (typeof window === 'undefined') return { ...defaults }
  try {
    return { ...defaults, ...JSON.parse(window.localStorage.getItem(DEVICE_PREFERENCES_KEY) || '{}') }
  } catch {
    return { ...defaults }
  }
}

export function saveDevicePreferences(value) {
  if (typeof window !== 'undefined') window.localStorage.setItem(DEVICE_PREFERENCES_KEY, JSON.stringify(value))
}

export function clearDevicePreferences() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(DEVICE_PREFERENCES_KEY)
}

