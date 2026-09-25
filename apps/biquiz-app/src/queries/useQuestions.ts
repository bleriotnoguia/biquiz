import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import { useSettingsStore } from '../stores/useSettingsStore'
import { Question, QuestionOption } from '@biquiz/shared'

interface RawTranslation {
  name: string
  locale: string
}

interface RawSourceText {
  source_text: string
  locale: string
}

interface RawOption {
  id: number
  name: RawTranslation[]
  is_correct: boolean
}

interface RawQuestion {
  id: number
  question_category_id: number
  name: RawTranslation[]
  source_text: RawSourceText[]
  options: RawOption[]
}

const fetchQuestions = async (category_id: string, lang: string): Promise<Question[]> => {
  const { data, error } = await supabase
    .from('questions')
    .select(
      `id, question_category_id,
      source_text:question_translations(source_text, locale),
      name:question_translations(name, locale),
      options:question_options(id, name:question_option_translations(name, locale), is_correct)`
    )
    .eq('question_category_id', category_id)
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  return (
    (data as RawQuestion[])?.map((ques) => {
      const name = ques.name.find((i) => i.locale === lang)?.name ?? ''
      const source_text = ques.source_text.find((i) => i.locale === lang)?.source_text ?? ''
      const options: QuestionOption[] = ques.options.map((opt) => ({
        id: opt.id,
        is_correct: opt.is_correct,
        name: opt.name.find((i) => i.locale === lang)?.name ?? '',
      }))
      return {
        id: ques.id,
        question_category_id: ques.question_category_id,
        name,
        source_text,
        options,
      }
    }) ?? []
  )
}

export const useQuestions = (category_id: string) => {
  const language = useSettingsStore((s) => s.language)
  return useQuery({
    queryKey: ['questions', category_id, language],
    queryFn: () => fetchQuestions(category_id, language),
    enabled: !!category_id,
    staleTime: 5 * 60 * 1000,
  })
}
