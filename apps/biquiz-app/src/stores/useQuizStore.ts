import { create } from 'zustand'
import { Choice } from '@biquiz/shared'

// Progress snapshot taken just before the finished quiz's score is saved.
export interface LastResult {
  previousBest: number | null
  previousTotalStars: number
}

interface QuizStore {
  choices: Choice[]
  categoryId: string
  lastResult: LastResult | null
  addChoice: (c: Choice) => void
  deleteChoices: () => void
  setCategoryId: (id: string) => void
  setLastResult: (r: LastResult) => void
}

export const useQuizStore = create<QuizStore>()((set) => ({
  choices: [],
  categoryId: '',
  lastResult: null,
  addChoice: (c) => set((s) => ({ choices: [c, ...s.choices] })),
  deleteChoices: () => set({ choices: [] }),
  setCategoryId: (id) => set({ categoryId: id }),
  setLastResult: (r) => set({ lastResult: r }),
}))
