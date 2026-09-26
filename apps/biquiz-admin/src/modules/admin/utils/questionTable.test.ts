import { describe, expect, it } from 'vitest'
import { filterQuestions, lookupLabel, pageWindow, QuestionListItem } from './questionTable'

const questions: QuestionListItem[] = [
  {
    id: 1,
    name_en: 'Who was betrayed by Delilah?',
    name_fr: 'Quel juge a été trahi par Dalila ?',
    source_text_en: 'Judges 16:13',
    source_text_fr: 'Juges 16:13',
    is_active: true,
    category_id: 2,
    type_id: 1,
  },
  {
    id: 19,
    name_en: 'To whom did the angel appear?',
    name_fr: 'À qui l’ange est-il apparu ?',
    source_text_en: 'Genesis 9:1-3',
    source_text_fr: 'Genèse 9:1-3',
    is_active: false,
    category_id: 1,
    type_id: 2,
  },
]

describe('filterQuestions', () => {
  const base = { search: '', status: 'all' as const, categoryId: 'all', typeId: 'all' }

  it('matches english, french, source text and id', () => {
    expect(filterQuestions(questions, { ...base, search: 'dalila' })).toEqual([questions[0]])
    expect(filterQuestions(questions, { ...base, search: 'genesis' })).toEqual([questions[1]])
    expect(filterQuestions(questions, { ...base, search: '#19' })).toEqual([questions[1]])
    expect(filterQuestions(questions, { ...base, search: '19' })).toEqual([questions[1]])
  })

  it('filters by status, category and type together', () => {
    expect(
      filterQuestions(questions, { ...base, status: 'inactive', categoryId: '1', typeId: '2' }),
    ).toEqual([questions[1]])
    expect(filterQuestions(questions, { ...base, status: 'active', categoryId: '1' })).toEqual([])
  })
})

describe('lookupLabel', () => {
  it('prefers the english name and falls back to the id', () => {
    expect(
      lookupLabel(
        [{ id: 2, translate: [{ locale: 'fr', name: 'Hommes' }, { locale: 'en', name: 'Men' }] }],
        2,
      ),
    ).toBe('Men')
    expect(lookupLabel([], 4)).toBe('4')
    expect(lookupLabel([], undefined)).toBe('—')
  })
})

describe('pageWindow', () => {
  it('collapses distant pages', () => {
    expect(pageWindow(7, 12)).toEqual([0, 'gap', 6, 7, 8, 'gap', 11])
  })

  it('lists every page when there are few', () => {
    expect(pageWindow(0, 3)).toEqual([0, 1, 2])
  })
})
