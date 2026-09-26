import { IOption } from '../interfaces'

export const TRUE_FALSE_CODE = 'true_false'
export const DEFAULT_OPTION_COUNT = 4

export const emptyOption = (): IOption => ({ is_correct: false, name_en: '', name_fr: '' })

export const trueFalseOptions = (): IOption[] => [
  { is_correct: true, name_en: 'True', name_fr: 'Vrai' },
  { is_correct: false, name_en: 'False', name_fr: 'Faux' },
]

const isTrueLabel = (option: IOption) => ['vrai', 'true'].includes(option.name_fr.trim().toLowerCase())

/** Options shown for a type: two fixed answers for true/false, a free list otherwise. */
export function optionsForType(code: string | undefined, current: IOption[]): IOption[] {
  if (code !== TRUE_FALSE_CODE) {
    return current.length >= 2 ? current : Array.from({ length: DEFAULT_OPTION_COUNT }, emptyOption)
  }
  const base = current.length === 2 && current.some(isTrueLabel) ? current : trueFalseOptions()
  return [...base].sort((a, b) => Number(isTrueLabel(b)) - Number(isTrueLabel(a)))
}
