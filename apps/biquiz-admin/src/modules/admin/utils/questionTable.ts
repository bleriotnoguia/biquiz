export type QuestionFilter = {
  search: string
  status: 'all' | 'active' | 'inactive'
  categoryId: string
  typeId: string
}

export type QuestionListItem = {
  id?: number
  name_en: string
  name_fr: string
  source_text_en: string
  source_text_fr: string
  is_active: boolean
  category_id?: number
  type_id?: number
}

export type NamedLookup = {
  id: number
  code?: string
  translate?: { locale: string; name: string }[] | null
}

export function filterQuestions<T extends QuestionListItem>(questions: T[], filter: QuestionFilter): T[] {
  const query = filter.search.trim().toLowerCase().replace(/^#/, '')

  return questions.filter((item) => {
    if (filter.status === 'active' && !item.is_active) return false
    if (filter.status === 'inactive' && item.is_active) return false
    if (filter.categoryId !== 'all' && String(item.category_id ?? '') !== filter.categoryId) return false
    if (filter.typeId !== 'all' && String(item.type_id ?? '') !== filter.typeId) return false
    if (!query) return true

    const haystack = [item.name_en, item.name_fr, item.source_text_en, item.source_text_fr, item.id != null ? String(item.id) : '']
      .filter(Boolean)
      .join('\n')
      .toLowerCase()

    return haystack.includes(query)
  })
}

export function lookupLabel(items: NamedLookup[], id: number | undefined): string {
  if (id == null) return '—'
  const item = items.find((entry) => Number(entry.id) === Number(id))
  if (!item?.translate?.length) return String(id)
  const english = item.translate.find((entry) => entry.locale === 'en')?.name
  const any = item.translate.find((entry) => entry.name)?.name
  return english || any || String(id)
}

export function pageWindow(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index)

  const pages = [0, total - 1, current - 1, current, current + 1].filter(
    (page, index, list) => page >= 0 && page < total && list.indexOf(page) === index,
  )
  pages.sort((a, b) => a - b)

  const window: Array<number | 'gap'> = []
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) window.push('gap')
    window.push(page)
  })
  return window
}
