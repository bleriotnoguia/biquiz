export const QUESTION_TYPES = ['multiple_choice_single_answer', 'true_false'] as const

export type QuestionTypeCode = (typeof QUESTION_TYPES)[number]

export type ImportOption = {
  name_fr: string
  name_en?: string
  is_correct: boolean
}

export type ImportQuestion = {
  type?: string
  name_fr: string
  name_en?: string
  source_text_fr?: string
  source_text_en?: string
  options: ImportOption[]
}

export type ImportTheme = {
  category_id?: number
  key?: string
  name_fr: string
  name_en?: string
  level?: number
  questions: ImportQuestion[]
}

export type ImportPayload = {
  themes: ImportTheme[]
}

export type ParseResult = {
  payload: ImportPayload
  errors: string[]
  warnings: string[]
}

export const MAX_OPTIONS = 6

const str = (value: unknown): string => (value === undefined || value === null ? '' : String(value).trim())

const toBool = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  return ['true', '1', 'yes', 'oui', 'x'].includes(str(value).toLowerCase())
}

const toOptionalInt = (value: unknown): number | undefined => {
  const n = parseInt(str(value), 10)
  return Number.isFinite(n) ? n : undefined
}

// Mirrors public.normalize_text() in the Supabase migrations: same rules on both sides so the
// preview and the import agree on what counts as a duplicate.
export const normalizeText = (value: string | undefined): string =>
  (value ?? '')
    .toLowerCase()
    .replace(/[’‘ʼ`´]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/[\u00a0\u202f\u2009]/g, ' ')
    .replace(/\s*"\s*/g, '"')
    .replace(/\s+([?!:;.,])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

export const detectQuestionType = (question: ImportQuestion): string => {
  if (question.type) return question.type
  const labels = question.options.map((o) => normalizeText(o.name_fr)).sort()
  const isTrueFalse = ['faux,vrai', 'false,true'].includes(labels.join(','))
  return isTrueFalse ? 'true_false' : 'multiple_choice_single_answer'
}

export type ExistingCategory = {
  id: number
  level: number
  source_key?: string | null
  translate: { locale: string; name: string }[] | null
}

// Same resolution order as public.import_questions(): category_id, then key, then name.
// With a key, the name fallback ignores categories that already carry another key.
export const resolveTheme = (theme: ImportTheme, categories: ExistingCategory[]) => {
  if (theme.category_id) return categories.find((c) => c.id === theme.category_id)
  if (theme.key) {
    const byKey = categories.find((c) => c.source_key === theme.key)
    if (byKey) return byKey
  }
  const names = [theme.name_fr, theme.name_en].filter(Boolean).map((n) => normalizeText(n))
  return categories.find(
    (c) =>
      (!theme.key || !c.source_key) && c.translate?.some((t) => names.includes(normalizeText(t.name)))
  )
}

export const findHomonyms = (theme: ImportTheme, categories: ExistingCategory[]) => {
  const target = resolveTheme(theme, categories)
  const name = normalizeText(theme.name_fr)
  return categories.filter(
    (c) => c.id !== target?.id && c.translate?.some((t) => normalizeText(t.name) === name)
  )
}

export const validatePayload = (payload: ImportPayload): string[] => {
  const errors: string[] = []

  if (!payload.themes.length) errors.push('No theme found in the file.')

  payload.themes.forEach((theme, t) => {
    const label = theme.name_fr || `#${t + 1}`
    if (!theme.name_fr && !theme.category_id) errors.push(`Theme #${t + 1}: "name_fr" is required.`)
    if (!theme.questions.length) errors.push(`Theme ${label}: no questions.`)

    theme.questions.forEach((q, i) => {
      const where = `Theme ${label}, question #${i + 1}`
      const type = detectQuestionType(q)
      if (!q.name_fr) errors.push(`${where}: "name_fr" is required.`)
      if (!(QUESTION_TYPES as readonly string[]).includes(type)) {
        errors.push(`${where}: unsupported type "${type}" (expected ${QUESTION_TYPES.join(' or ')}).`)
      }
      if (q.options.length < 2) errors.push(`${where}: at least 2 options are required.`)
      if (type === 'true_false' && q.options.length !== 2) {
        errors.push(`${where}: a true_false question needs exactly 2 options.`)
      }
      if (q.options.some((o) => !o.name_fr)) errors.push(`${where}: every option needs a "name_fr".`)
      const correct = q.options.filter((o) => o.is_correct).length
      if (correct !== 1) errors.push(`${where}: exactly one correct option expected (found ${correct}).`)
    })
  })

  return errors
}

export const collectWarnings = (payload: ImportPayload): string[] => {
  const warnings: string[] = []

  const byName = new Map<string, ImportTheme[]>()
  payload.themes.forEach((theme) => {
    const name = normalizeText(theme.name_fr)
    if (name) byName.set(name, [...(byName.get(name) ?? []), theme])
  })
  byName.forEach((themes) => {
    if (themes.length < 2) return
    const keys = new Set(themes.map((t) => t.key ?? ''))
    warnings.push(
      keys.size === themes.length && !keys.has('')
        ? `${themes.length} themes are named "${themes[0].name_fr}": they stay separate (distinct keys) but look identical in the app. Consider renaming them (e.g. "${themes[0].name_fr} II").`
        : `${themes.length} themes are named "${themes[0].name_fr}" without distinct keys: they will be merged into one theme.`
    )
  })

  payload.themes.forEach((theme) => {
    const seen = new Set<string>()
    theme.questions.forEach((q, i) => {
      const name = normalizeText(q.name_fr)
      if (seen.has(name)) {
        warnings.push(`Theme ${theme.name_fr}, question #${i + 1}: duplicate of an earlier question, it will be skipped.`)
      }
      seen.add(name)
    })
  })

  return warnings
}

const normalizeJson = (raw: unknown): ImportPayload => {
  const root = raw as { themes?: unknown[] } | unknown[]
  const themes = Array.isArray(root) ? root : Array.isArray(root?.themes) ? root.themes : null
  if (!themes) throw new Error('JSON must be an object with a "themes" array.')

  return {
    themes: themes.map((t) => {
      const theme = t as Record<string, unknown>
      const questions = Array.isArray(theme.questions) ? theme.questions : []
      return {
        category_id: toOptionalInt(theme.category_id),
        key: str(theme.key) || undefined,
        name_fr: str(theme.name_fr),
        name_en: str(theme.name_en) || undefined,
        level: toOptionalInt(theme.level),
        questions: questions.map((q) => {
          const question = q as Record<string, unknown>
          const options = Array.isArray(question.options) ? question.options : []
          return {
            type: str(question.type) || undefined,
            name_fr: str(question.name_fr),
            name_en: str(question.name_en) || undefined,
            source_text_fr: str(question.source_text_fr) || undefined,
            source_text_en: str(question.source_text_en) || undefined,
            options: options.map((o) => {
              const option = o as Record<string, unknown>
              return {
                name_fr: str(option.name_fr),
                name_en: str(option.name_en) || undefined,
                is_correct: toBool(option.is_correct),
              }
            }),
          }
        }),
      }
    }),
  }
}

const detectDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const counts = [',', ';', '\t'].map((d) => ({ d, n: firstLine.split(d).length }))
  return counts.sort((a, b) => b.n - a.n)[0].d
}

// RFC 4180: quoted fields may contain delimiters, line breaks and doubled quotes.
export const parseCsvRows = (text: string): string[][] => {
  const delimiter = detectDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

const parseCorrect = (value: string, optionCount: number): number => {
  const v = value.trim().toUpperCase()
  const n = /^[A-F]$/.test(v) ? v.charCodeAt(0) - 64 : parseInt(v, 10)
  return n >= 1 && n <= optionCount ? n : -1
}

const normalizeCsv = (text: string): { payload: ImportPayload; errors: string[] } => {
  const rows = parseCsvRows(text)
  if (rows.length < 2) throw new Error('CSV must contain a header row and at least one question.')

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const required = ['theme_fr', 'question_fr', 'option1_fr', 'option2_fr', 'correct']
  const missing = required.filter((name) => col(name) === -1)
  if (missing.length) throw new Error(`Missing CSV column(s): ${missing.join(', ')}`)

  const errors: string[] = []
  const themes = new Map<string, ImportTheme>()

  rows.slice(1).forEach((cells, idx) => {
    const get = (name: string) => (col(name) === -1 ? '' : (cells[col(name)] ?? '').trim())
    const line = idx + 2

    const options: ImportOption[] = []
    for (let n = 1; n <= MAX_OPTIONS; n++) {
      const name_fr = get(`option${n}_fr`)
      if (!name_fr) continue
      options.push({ name_fr, name_en: get(`option${n}_en`) || undefined, is_correct: false })
    }

    const correct = parseCorrect(get('correct'), options.length)
    if (correct === -1) errors.push(`CSV line ${line}: "correct" must be a number between 1 and ${options.length} (or a letter A-F).`)
    else options[correct - 1].is_correct = true

    const themeFr = get('theme_fr')
    const themeKey = get('theme_key')
    const groupKey = themeKey ? `key:${themeKey}` : `name:${normalizeText(themeFr)}`
    if (!themes.has(groupKey)) {
      themes.set(groupKey, {
        key: themeKey || undefined,
        name_fr: themeFr,
        name_en: get('theme_en') || undefined,
        level: toOptionalInt(get('theme_level')),
        questions: [],
      })
    }

    themes.get(groupKey)!.questions.push({
      type: get('type') || undefined,
      name_fr: get('question_fr'),
      name_en: get('question_en') || undefined,
      source_text_fr: get('source_fr') || undefined,
      source_text_en: get('source_en') || undefined,
      options,
    })
  })

  return { payload: { themes: Array.from(themes.values()) }, errors }
}

export const parseImportFile = (fileName: string, text: string): ParseResult => {
  const content = text.replace(/^\uFEFF/, '')
  const isJson = fileName.toLowerCase().endsWith('.json') || /^\s*[[{]/.test(content)

  try {
    const { payload, errors } = isJson
      ? { payload: normalizeJson(JSON.parse(content)), errors: [] as string[] }
      : normalizeCsv(content)
    return { payload, errors: [...errors, ...validatePayload(payload)], warnings: collectWarnings(payload) }
  } catch (e) {
    return { payload: { themes: [] }, errors: [(e as Error).message], warnings: [] }
  }
}

export const CSV_HEADER = [
  'theme_level',
  'theme_fr',
  'theme_en',
  'question_fr',
  'question_en',
  'source_fr',
  'source_en',
  ...Array.from({ length: 4 }, (_, i) => [`option${i + 1}_fr`, `option${i + 1}_en`]).flat(),
  'correct',
  'theme_key',
  'type',
]

export const JSON_TEMPLATE: ImportPayload = {
  themes: [
    {
      key: 'my-source-1',
      level: 1,
      name_fr: 'Hommes',
      name_en: 'Men',
      questions: [
        {
          name_fr: 'Qui a exigé que les Israélites renvoient leurs femmes étrangères ?',
          name_en: 'Who demanded that the Israelites send away their foreign wives?',
          source_text_fr: 'Esdras 10:10, 11',
          source_text_en: 'Ezra 10:10, 11',
          options: [
            { name_fr: 'Asa', name_en: 'Asa', is_correct: false },
            { name_fr: 'Moïse', name_en: 'Moses', is_correct: false },
            { name_fr: 'Néhémie', name_en: 'Nehemiah', is_correct: false },
            { name_fr: 'Esdras', name_en: 'Ezra', is_correct: true },
          ],
        },
      ],
    },
    {
      key: 'my-source-6',
      level: 6,
      name_fr: 'Vrai ou Faux',
      name_en: 'True or False',
      questions: [
        {
          type: 'true_false',
          name_fr: 'Jonas a été avalé par un grand poisson.',
          name_en: 'Jonah was swallowed by a huge fish.',
          source_text_fr: 'Jonas 1:17',
          source_text_en: 'Jonah 1:17',
          options: [
            { name_fr: 'Vrai', name_en: 'True', is_correct: true },
            { name_fr: 'Faux', name_en: 'False', is_correct: false },
          ],
        },
      ],
    },
  ],
}

const csvCell = (value: string | number) => {
  const s = String(value)
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const toCsv = (rows: (string | number)[][]) => rows.map((row) => row.map(csvCell).join(',')).join('\n')

export const CSV_TEMPLATE = toCsv([
  CSV_HEADER,
  [
    1,
    'Hommes',
    'Men',
    'Qui a exigé que les Israélites renvoient leurs femmes étrangères ?',
    'Who demanded that the Israelites send away their foreign wives?',
    'Esdras 10:10, 11',
    'Ezra 10:10, 11',
    'Asa',
    'Asa',
    'Moïse',
    'Moses',
    'Néhémie',
    'Nehemiah',
    'Esdras',
    'Ezra',
    4,
    'my-source-1',
    '',
  ],
  [
    6,
    'Vrai ou Faux',
    'True or False',
    'Jonas a été avalé par un grand poisson.',
    'Jonah was swallowed by a huge fish.',
    'Jonas 1:17',
    'Jonah 1:17',
    'Vrai',
    'True',
    'Faux',
    'False',
    '',
    '',
    '',
    '',
    1,
    'my-source-6',
    'true_false',
  ],
])
