export interface CategoryConfig {
  id: number
  name: string
  level: number
  is_active: number
  parent_id: number | null
}

export interface QuestionOption {
  id: number
  name: string
  is_correct: boolean
}

export interface Question {
  id: number
  type: string
  name: string
  source_text: string
  options: QuestionOption[]
  question_category_id: number
}

export interface Choice {
  question_id: number
  choice_id: number
}

export interface Score {
  category_id: string
  stars: number
}
