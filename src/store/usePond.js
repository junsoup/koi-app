
// src/state/usePond.js

import { createStore } from 'zustand/vanilla'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import { THEMES } from '../theme'

// ---- Create vanilla store (no React dependency) ----
export const pondStore = createStore((set, get) => ({
  // --- Views ---
  views: [
    { pos: [12, 9, 0], zoom: 50, pixelScale: 4 },
    { pos: [0, 15, 0], zoom: 22, pixelScale: 3 },
  ],
  viewIdx: 0,
  nextView: () => set((s) => ({ viewIdx: (s.viewIdx + 1) % s.views.length })),

  // --- Mouse ---
  mouse: { has: false, point: [0, 0, 0] },
  setMouse: (has, vec3) => {
    if (vec3) set({ mouse: { has, point: [vec3.x, vec3.y, vec3.z] } })
    else set((s) => ({ mouse: { has, point: s.mouse.point } }))
  },

  // --- Themes ---
  themeKey: 'forest',
  setTheme: (key) => {
    if (THEMES[key]) set({ themeKey: key })
    else console.warn(`Theme "${key}" not found in THEMES`)
  },
  nextTheme: () => {
    const keys = Object.keys(THEMES)
    const current = get().themeKey
    const idx = keys.indexOf(current)
    const next = keys[(idx + 1) % keys.length]
    set({ themeKey: next })
  },
}))

// ---- React hook that subscribes to the vanilla store with a selector ----
export function usePond(selector = (s) => s, equalityFn = Object.is) {
  return useSyncExternalStoreWithSelector(
    pondStore.subscribe,
    pondStore.getState,
    pondStore.getState,
    selector,
    equalityFn
  )
}

// ---- Convenience hooks (unchanged external API) ----
export const useCurrentView = () => usePond((s) => s.views[s.viewIdx])
export const usePixelScale  = () => usePond((s) => s.views[s.viewIdx].pixelScale)
export const useMouseState  = () => usePond((s) => s.mouse)
export const useThemeKey    = () => usePond((s) => s.themeKey)
export const useTheme       = () => usePond((s) => THEMES[s.themeKey])

// Actions
export const useNextView  = () => usePond((s) => s.nextView)
export const useSetTheme  = () => usePond((s) => s.setTheme)
export const useNextTheme = () => usePond((s) => s.nextTheme)
export const useSetMouse  = () => usePond((s) => s.setMouse)

