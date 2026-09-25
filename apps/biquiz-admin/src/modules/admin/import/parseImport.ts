export type ImportOption = {
  name_fr: string
  name_en?: string
  is_correct: boolean
}

export type ImportQuestion = {
  name_fr: string
  name_en?: string
  source_text_fr?: string
  source_text_en?: string
  options: ImportOption[]
}

export type ImportTheme = {
  category_id?: number
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

export const validatePayload = (payload: ImportPayload): string[] => {
  const errors: string[] = []

  if (!payload.themes.length) errors.push('No theme found in the file.')

  payload.themes.forEach((theme, t) => {
    const label = theme.name_fr || `#${t + 1}`
    if (!theme.name_fr && !theme.category_id) errors.push(`Theme #${t + 1}: "name_fr" is required.`)
    if (!theme.questions.length) errors.push(`Theme ${label}: no questions.`)

    theme.questions.forEach((q, i) => {
      const where = `Theme ${label}, question #${i + 1}`
      if (!q.name_fr) errors.push(`${where}: "name_fr" is required.`)
      if (q.options.length < 2) errors.push(`${where}: at least 2 options are required.`)
      if (q.options.some((o) => !o.name_fr)) errors.push(`${where}: every option needs a "name_fr".`)
      const correct = q.options.filter((o) => o.is_correct).length
      if (correct !== 1) errors.push(`${where}: exactly one correct option expected (found ${correct}).`)
    })
  })

  return errors
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
        name_fr: str(theme.name_fr),
        name_en: str(theme.name_en) || undefined,
        level: toOptionalInt(theme.level),
        questions: questions.map((q) => {
          const question = q as Record<string, unknown>
          const options = Array.isArray(question.options) ? question.options : []
          return {
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

const normalizeCsv = (text: string): ParseResult => {
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
    const key = themeFr.toLowerCase()
    if (!themes.has(key)) {
      themes.set(key, {
        name_fr: themeFr,
        name_en: get('theme_en') || undefined,
        level: toOptionalInt(get('theme_level')),
        questions: [],
      })
    }

    themes.get(key)!.questions.push({
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
    if (isJson) {
      const payload = normalizeJson(JSON.parse(content))
      return { payload, errors: validatePayload(payload) }
    }
    const { payload, errors } = normalizeCsv(content)
    return { payload, errors: [...errors, ...validatePayload(payload)] }
  } catch (e) {
    return { payload: { themes: [] }, errors: [(e as Error).message] }
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
]

export const JSON_TEMPLATE: ImportPayload = {
  themes: [
    {
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
  ],
}

const csvCell = (value: string | number) => {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const CSV_TEMPLATE = [
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
  ],
]
  .map((row) => row.map(csvCell).join(','))
  .join('\n')
