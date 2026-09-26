import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type FontSize = 'normal' | 'large'

interface SettingsStore {
  isEasy: boolean
  theme: ThemeMode
  fontSize: FontSize
  language: string
  displaySource: boolean
  quizLength: number
  timerEnabled: boolean
  timerSeconds: number
  autoNext: boolean
  sounds: boolean
  haptics: boolean
  reminderEnabled: boolean
  reminderHour: number
  setIsEasy: (v: boolean) => void
  setTheme: (v: ThemeMode) => void
  setFontSize: (v: FontSize) => void
  setLanguage: (v: string) => void
  setDisplaySource: (v: boolean) => void
  setQuizLength: (v: number) => void
  setTimerEnabled: (v: boolean) => void
  setTimerSeconds: (v: number) => void
  setAutoNext: (v: boolean) => void
  setSounds: (v: boolean) => void
  setHaptics: (v: boolean) => void
  setReminder: (enabled: boolean, hour: number) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      isEasy: true,
      theme: 'light',
      fontSize: 'normal',
      language: 'fr',
      displaySource: true,
      quizLength: 20,
      timerEnabled: false,
      timerSeconds: 20,
      autoNext: false,
      sounds: false,
      haptics: true,
      reminderEnabled: false,
      reminderHour: 19,
      setIsEasy: (v) => set({ isEasy: v }),
      setTheme: (v) => set({ theme: v }),
      setFontSize: (v) => set({ fontSize: v }),
      setLanguage: (v) => set({ language: v }),
      setDisplaySource: (v) => set({ displaySource: v }),
      setQuizLength: (v) => set({ quizLength: v }),
      setTimerEnabled: (v) => set({ timerEnabled: v }),
      setTimerSeconds: (v) => set({ timerSeconds: v }),
      setAutoNext: (v) => set({ autoNext: v }),
      setSounds: (v) => set({ sounds: v }),
      setHaptics: (v) => set({ haptics: v }),
      setReminder: (enabled, hour) => set({ reminderEnabled: enabled, reminderHour: hour }),
    }),
    {
      name: 'biquiz-settings',
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>
        if (version < 1) {
          state.theme = state.isDarkMode ? 'dark' : 'light'
          delete state.isDarkMode
        }
        return state as unknown as SettingsStore
      },
    }
  )
)
