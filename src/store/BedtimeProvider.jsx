import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { bedtimeReducer, createDefaultData, dayTypeFor, getAccessibility, getSchedule, localDateKey } from '../domain/model.js'
import { deleteAllData, hashPin, loadAppData, saveAppData } from '../data/storage.js'
import {
  checkCloud,
  clearCloudConnection,
  fetchCloudState,
  getDeviceToken,
  getParentToken,
  importCloudState,
  loadOutbox,
  operationId,
  saveDeviceToken,
  saveOutbox,
  saveParentToken,
  sendCloudAction,
  unlockCloudParent,
} from '../data/cloud.js'
import { BedtimeActionsContext, BedtimeStateContext } from './contexts.js'
import { drainCloudActions } from './drainCloudActions.js'
import { playActionSound } from '../audio/soundscape.js'
import { getCompanionPack } from '../domain/themePacks.js'

const CHILD_ACTIONS = new Set(['COMPLETE_TASK', 'RESET_TASK', 'SKIP_TASK', 'CONFIRM_BED', 'REQUEST_REWARD', 'SWITCH_PROFILE'])

export function BedtimeProvider({ children }) {
  const [initial] = useState(loadAppData)
  const [state, localDispatch] = useReducer(bedtimeReducer, initial.data)
  const [saveStatus, setSaveStatus] = useState(initial.issue ? 'error' : 'saved')
  const [saveMessage, setSaveMessage] = useState(initial.issue)
  const [parentUnlocked, setParentUnlocked] = useState(false)
  const [cloud, setCloud] = useState({ mode: 'checking', revision: 0, pushAvailable: false, message: '正在连接家庭云端…' })
  const firstRender = useRef(true)
  const latestState = useRef(state)
  const cloudRef = useRef(cloud)
  const outboxRef = useRef(loadOutbox())
  const syncingRef = useRef(false)
  const activeAccessibility = getAccessibility(state)

  useEffect(() => { latestState.current = state }, [state])
  useEffect(() => { cloudRef.current = cloud }, [cloud])

  const replaceFromCloud = useCallback((payload) => {
    if (!payload?.state) return
    localDispatch({ type: 'REPLACE_DATA', payload: payload.state })
    setCloud((value) => {
      const nextCloud = { ...value, mode: 'connected', revision: payload.revision || value.revision, message: null }
      cloudRef.current = nextCloud
      return nextCloud
    })
    setSaveStatus('saved')
    setSaveMessage(null)
  }, [])

  const flushCloud = useCallback(async () => {
    if (syncingRef.current || cloudRef.current.mode !== 'connected' || !getDeviceToken()) return
    syncingRef.current = true
    try {
      const result = await drainCloudActions({
        readItems: () => outboxRef.current,
        writeItems: (items) => {
          outboxRef.current = items
          saveOutbox(items)
        },
        getToken: (item) => item.requiresParent ? getParentToken() : getDeviceToken(),
        sendAction: (item, token) => sendCloudAction(item.id, item.action, token),
      })
      if (result.status === 'needs-parent') {
        setSaveStatus('retrying')
        setSaveMessage('家长设置尚未同步，请重新进入家长区验证 PIN。')
        return
      }
      if (result.payload) replaceFromCloud(result.payload)
      else {
        setSaveStatus('saved')
        setSaveMessage(null)
      }
    } catch (error) {
      if (error?.status === 401 && !outboxRef.current[0]?.requiresParent) {
        clearCloudConnection()
        setCloud((value) => ({ ...value, mode: 'pairing', message: '这台设备需要重新连接家庭。' }))
      } else if ([401, 403].includes(error?.status) && outboxRef.current[0]?.requiresParent) {
        saveParentToken('')
        setParentUnlocked(false)
        setSaveStatus('retrying')
        setSaveMessage('家长验证已过期，请重新进入家长区验证 PIN。')
      } else {
        setSaveStatus('retrying')
        setSaveMessage(error instanceof Error ? `${error.message} 已保存在这台设备，联网后会自动同步。` : '已保存在这台设备，联网后会自动同步。')
        setCloud((value) => {
          const nextCloud = { ...value, mode: 'offline', message: '当前离线，操作会在联网后自动同步。' }
          cloudRef.current = nextCloud
          return nextCloud
        })
      }
    } finally {
      syncingRef.current = false
    }
  }, [replaceFromCloud])

  const connectCloud = useCallback(async (signal) => {
    try {
      const health = await checkCloud(signal)
      const token = getDeviceToken()
      if (!token) {
        const nextCloud = { mode: 'pairing', revision: 0, pushAvailable: health.pushAvailable, message: null }
        cloudRef.current = nextCloud
        setCloud(nextCloud)
        return
      }
      const payload = await fetchCloudState(token)
      saveDeviceToken(token)
      const nextCloud = { mode: 'connected', revision: payload.revision || 0, pushAvailable: health.pushAvailable, message: null }
      cloudRef.current = nextCloud
      setCloud(nextCloud)
      replaceFromCloud(payload)
      window.setTimeout(flushCloud, 0)
    } catch (error) {
      if (signal?.aborted) return
      if (error?.status === 401) {
        clearCloudConnection()
        const nextCloud = { mode: 'pairing', revision: 0, pushAvailable: false, message: '这台设备需要重新连接家庭。' }
        cloudRef.current = nextCloud
        setCloud(nextCloud)
      } else if (getDeviceToken()) {
        const nextCloud = { ...cloudRef.current, mode: 'offline', message: '当前离线，操作会在联网后自动同步。' }
        cloudRef.current = nextCloud
        setCloud(nextCloud)
        if (outboxRef.current.length) {
          setSaveStatus('retrying')
          setSaveMessage('已保存在这台设备，联网后会自动同步。')
        }
      } else {
        const nextCloud = { mode: 'local', revision: 0, pushAvailable: false, message: null }
        cloudRef.current = nextCloud
        setCloud(nextCloud)
      }
    }
  }, [flushCloud, replaceFromCloud])

  useEffect(() => {
    const controller = new AbortController()
    connectCloud(controller.signal)
    return () => controller.abort()
  }, [connectCloud])

  useEffect(() => {
    const retry = () => cloudRef.current.mode === 'offline' ? connectCloud() : flushCloud()
    const retryWhenVisible = () => { if (document.visibilityState === 'visible' && cloudRef.current.mode === 'offline') connectCloud() }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', retryWhenVisible)
    return () => { window.removeEventListener('online', retry); document.removeEventListener('visibilitychange', retryWhenVisible) }
  }, [connectCloud, flushCloud])

  const dispatch = useCallback((action) => {
    const currentAccessibility = getAccessibility(latestState.current)
    const muted = action.type === 'UPDATE_ACCESSIBILITY' && action.payload?.soundOff === false
      ? false
      : currentAccessibility.soundOff
    playActionSound(action, muted)
    localDispatch(action)
    if (!['connected', 'offline'].includes(cloudRef.current.mode)) return
    const item = { id: operationId(), action, requiresParent: !CHILD_ACTIONS.has(action.type), queuedAt: Date.now() }
    outboxRef.current = [...outboxRef.current, item]
    saveOutbox(outboxRef.current)
    if (cloudRef.current.mode === 'connected') {
      setSaveStatus('saving')
      setSaveMessage(null)
      queueMicrotask(flushCloud)
    } else {
      setSaveStatus('retrying')
      setSaveMessage('已保存在这台设备，联网后会自动同步。')
    }
  }, [flushCloud])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      if (!initial.migrated) return
    }
    let active = true
    try {
      saveAppData(state)
      queueMicrotask(() => {
        if (!active || outboxRef.current.length) return
        setSaveStatus('saved')
        setSaveMessage(null)
      })
    } catch {
      queueMicrotask(() => {
        if (!active) return
        setSaveStatus('retrying')
        setSaveMessage('今晚的调整还没保存，请保留这个页面后再试。')
      })
    }
    return () => { active = false }
  }, [initial.migrated, state])

  useEffect(() => {
    const preserveLatestState = () => {
      try { saveAppData(latestState.current) } catch { /* 页面仍会保留明确的保存失败状态 */ }
    }
    window.addEventListener('pagehide', preserveLatestState)
    return () => window.removeEventListener('pagehide', preserveLatestState)
  }, [])

  useEffect(() => {
    const classes = [
      activeAccessibility.reduceMotion ? 'reduce-motion' : '',
      activeAccessibility.highContrast ? 'high-contrast' : '',
      activeAccessibility.largeText ? 'large-text' : '',
    ].filter(Boolean)
    document.documentElement.className = classes.join(' ')
  }, [activeAccessibility.highContrast, activeAccessibility.largeText, activeAccessibility.reduceMotion])

  useEffect(() => {
    if (cloud.mode === 'connected' || !state.setupComplete || !('Notification' in window) || Notification.permission !== 'granted') return undefined
    let timer
    let cancelled = false
    const findNextReminder = () => {
      const current = new Date()
      let next = null
      for (const profile of state.profiles) {
        for (let offset = 0; offset < 8; offset += 1) {
          const date = new Date(current)
          date.setDate(date.getDate() + offset)
          const dateKey = localDateKey(date, 0)
          const schedule = getSchedule(state, dayTypeFor(date), dateKey, profile.id)
          if (schedule.reminderEnabled === false) continue
          const reminderAt = new Date(`${dateKey}T${schedule.prepareTime}:00`)
          reminderAt.setMinutes(reminderAt.getMinutes() - Number(schedule.reminderMinutes || 30))
          if (reminderAt.getTime() <= current.getTime() + 1000) continue
          if (!next || reminderAt < next.reminderAt) next = { reminderAt, schedule, profile }
        }
      }
      return next
    }
    const armReminder = () => {
      const next = findNextReminder()
      if (!next || cancelled) return
      timer = window.setTimeout(async () => {
        if (cancelled) return
        const key = `${next.profile.id}:${next.reminderAt.getTime()}`
        if (window.localStorage.getItem('bedtime:last-reminder') !== key) {
          const companion = getCompanionPack(next.profile.character)
          const options = { body: `还有 ${next.schedule.reminderMinutes} 分钟开始准备，${companion.name}在今晚等你。`, icon: '/assets/app-icon.png', badge: '/moon-icon.svg', tag: 'bedtime-reminder', renotify: false }
          try {
            const registration = await navigator.serviceWorker?.getRegistration()
            if (registration) await registration.showNotification(`晚安，${next.profile.name}`, options)
            else new Notification(`晚安，${next.profile.name}`, options)
            window.localStorage.setItem('bedtime:last-reminder', key)
          } catch { /* 本地模式提醒失败不影响睡前流程 */ }
        }
        armReminder()
      }, Math.min(2147483647, next.reminderAt.getTime() - Date.now()))
    }
    armReminder()
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [cloud.mode, state])

  const pairCloud = useCallback((payload) => {
    saveDeviceToken(payload.token)
    saveOutbox([])
    outboxRef.current = []
    const nextCloud = { ...cloudRef.current, mode: 'connected', revision: payload.revision || 0, message: null }
    cloudRef.current = nextCloud
    setCloud(nextCloud)
    replaceFromCloud(payload)
  }, [replaceFromCloud])

  const unlockParent = useCallback(async (pin) => {
    if (cloudRef.current.mode === 'connected') {
      const result = await unlockCloudParent(pin)
      saveParentToken(result.token)
      setParentUnlocked(true)
      queueMicrotask(flushCloud)
      return true
    }
    if (cloudRef.current.mode === 'offline') throw new Error('当前离线。孩子任务可以继续，联网后再进入家长区。')
    const hashed = await hashPin(pin)
    if (hashed !== latestState.current.security.pinHash) return false
    setParentUnlocked(true)
    return true
  }, [flushCloud])

  const lockParent = useCallback(() => {
    setParentUnlocked(false)
  }, [])

  const replaceData = useCallback(async (data) => {
    localDispatch({ type: 'REPLACE_DATA', payload: data })
    saveAppData(data)
    if (cloudRef.current.mode !== 'connected') return data
    const payload = await importCloudState(data)
    replaceFromCloud(payload)
    return payload.state
  }, [replaceFromCloud])

  const resetApp = useCallback(async () => {
    const next = { ...createDefaultData(), security: { ...latestState.current.security } }
    if (cloudRef.current.mode === 'connected') await replaceData(next)
    else {
      deleteAllData()
      localDispatch({ type: 'REPLACE_DATA', payload: next })
    }
    setParentUnlocked(false)
  }, [replaceData])

  const retrySave = useCallback(() => {
    try {
      saveAppData(latestState.current)
      if (cloudRef.current.mode === 'connected' && outboxRef.current.length) {
        setSaveStatus('saving')
        flushCloud()
      } else if (cloudRef.current.mode === 'offline') {
        connectCloud()
      } else {
        setSaveStatus('saved')
        setSaveMessage(null)
      }
    } catch { setSaveStatus('error') }
  }, [connectCloud, flushCloud])

  const stateValue = useMemo(() => ({ state, saveStatus, saveMessage, parentUnlocked, cloud }), [state, saveStatus, saveMessage, parentUnlocked, cloud])
  const actionsValue = useMemo(() => ({ dispatch, unlockParent, lockParent, resetApp, replaceData, retrySave, pairCloud }), [dispatch, lockParent, pairCloud, replaceData, resetApp, retrySave, unlockParent])

  return (
    <BedtimeStateContext.Provider value={stateValue}>
      <BedtimeActionsContext.Provider value={actionsValue}>{children}</BedtimeActionsContext.Provider>
    </BedtimeStateContext.Provider>
  )
}
