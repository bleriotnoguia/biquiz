import { describe, expect, it } from 'vitest'
import { IOption } from '../interfaces'
import { optionsForType, trueFalseOptions } from './questionForm'

const option = (fr: string, correct = false): IOption => ({ is_correct: correct, name_en: fr, name_fr: fr })

describe('optionsForType', () => {
  it('builds Vrai then Faux for a true/false question', () => {
    expect(optionsForType('true_false', [option('Faux', true), option('Vrai')]).map((o) => o.name_fr)).toEqual([
      'Vrai',
      'Faux',
    ])
  })

  it('fills in the standard labels when the current options are not true/false', () => {
    expect(optionsForType('true_false', [option('Samson'), option('David')])).toEqual(trueFalseOptions())
  })

  it('keeps a free list of answers for the other types', () => {
    const current = [option('Samson', true), option('David')]
    expect(optionsForType('multiple_choice_single_answer', current)).toBe(current)
  })

  it('restores four empty answers when the list is too short', () => {
    expect(optionsForType(undefined, [option('Vrai')])).toHaveLength(4)
  })
})
