import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Choice } from '@biquiz/shared'

export interface Attempt {
  // Most recent answer first, as recorded by the quiz store.
  choices: Choice[]
  date: string
  // Questions still to review; shrinks as review sessions correct them.
  mistakeIds: number[]
}

interface HistoryStore {
  attempts: Record<string, Attempt>
  saveAttempt: (categoryId: string, attempt: Attempt) => void
  setMistakes: (categoryId: string, mistakeIds: number[]) => void
  clear: () => void
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      attempts: {},
      saveAttempt: (categoryId, attempt) =>
        set((s) => ({ attempts: { ...s.attempts, [categoryId]: attempt } })),
      setMistakes: (categoryId, mistakeIds) =>
        set((s) => {
          const attempt = s.attempts[categoryId]
          if (!attempt) return s
          return { attempts: { ...s.attempts, [categoryId]: { ...attempt, mistakeIds } } }
        }),
      clear: () => set({ attempts: {} }),
    }),
    { name: 'biquiz-history' }
  )
)
