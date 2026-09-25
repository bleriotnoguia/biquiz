import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import { useSettingsStore } from '../stores/useSettingsStore'
import { CategoryConfig } from '@biquiz/shared'

interface RawCategoryTranslation {
  name: string
}

interface RawCategory {
  id: number
  level: number
  is_active: boolean
  parent_id: number | null
  name: RawCategoryTranslation[]
}

const fetchCategories = async (lang: string): Promise<CategoryConfig[]> => {
  const { data, error } = await supabase
    .from('question_categories')
    .select('id,level,is_active,parent_id, name:question_category_translations(name)')
    .eq('question_category_translations.locale', lang)
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  return (
    (data as RawCategory[])?.map((cat) => {
      const [cat_name] = cat.name
      return { ...cat, ...cat_name, is_active: cat.is_active ? 1 : 0 }
    }) ?? []
  )
}

export const useCategories = () => {
  const language = useSettingsStore((s) => s.language)
  return useQuery({
    queryKey: ['categories', language],
    queryFn: () => fetchCategories(language),
    staleTime: 5 * 60 * 1000,
  })
}
