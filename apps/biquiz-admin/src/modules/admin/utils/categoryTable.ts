export type CategoryListItem = {
  id: number
  is_active: boolean
  translate?: { name: string; locale: string }[] | null
}

export type CategoryFilter = {
  search: string
  status: 'all' | 'active' | 'inactive'
}

export function filterCategories<T extends CategoryListItem>(categories: T[], filter: CategoryFilter): T[] {
  const query = filter.search.trim().toLowerCase().replace(/^#/, '')

  return categories.filter((category) => {
    if (filter.status === 'active' && !category.is_active) return false
    if (filter.status === 'inactive' && category.is_active) return false
    if (!query) return true

    const names = (category.translate ?? []).map((entry) => entry.name).join('\n')
    return `${names}\n${category.id}`.toLowerCase().includes(query)
  })
}

export function categoryName(category: CategoryListItem, locale: string): string {
  return category.translate?.find((entry) => entry.locale === locale)?.name || '—'
}
