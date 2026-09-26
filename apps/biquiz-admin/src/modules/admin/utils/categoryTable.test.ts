import { describe, expect, it } from 'vitest'
import { categoryName, filterCategories, CategoryListItem } from './categoryTable'

const categories: CategoryListItem[] = [
  { id: 2, is_active: true, translate: [{ locale: 'en', name: 'Men' }, { locale: 'fr', name: 'Hommes' }] },
  { id: 4, is_active: false, translate: [{ locale: 'en', name: 'Women' }, { locale: 'fr', name: 'Femmes' }] },
]

describe('filterCategories', () => {
  const base = { search: '', status: 'all' as const }

  it('matches either language and the id', () => {
    expect(filterCategories(categories, { ...base, search: 'homme' })).toEqual([categories[0]])
    expect(filterCategories(categories, { ...base, search: '#4' })).toEqual([categories[1]])
  })

  it('filters by status', () => {
    expect(filterCategories(categories, { ...base, status: 'inactive' })).toEqual([categories[1]])
  })
})

describe('categoryName', () => {
  it('returns the locale name or a dash', () => {
    expect(categoryName(categories[0], 'fr')).toBe('Hommes')
    expect(categoryName(categories[0], 'de')).toBe('—')
  })
})
