import { describe, expect, it } from 'vitest'
import {
  CSV_TEMPLATE,
  JSON_TEMPLATE,
  detectQuestionType,
  findHomonyms,
  normalizeText,
  parseCsvRows,
  parseImportFile,
  resolveTheme,
  toCsv,
} from './parseImport'

const HEADER =
  'theme_level,theme_fr,theme_en,question_fr,question_en,source_fr,source_en,option1_fr,option1_en,option2_fr,option2_en,option3_fr,option3_en,option4_fr,option4_en,correct'

describe('parseCsvRows', () => {
  it('keeps commas, semicolons and doubled quotes inside quoted fields', () => {
    const rows = parseCsvRows('a,b,c\n"Esdras 10:10, 11","dit ""oui"" ; non",x\r\n')
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['Esdras 10:10, 11', 'dit "oui" ; non', 'x'],
    ])
  })

  it('detects a semicolon delimiter from the header', () => {
    expect(parseCsvRows('a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('parseImportFile (CSV)', () => {
  it('parses a true/false row with 2 options and correct = 2', () => {
    const csv = `${HEADER}\n6,Vrai ou Faux,True or False,Adam était le frère d’Abel.,Adam was Abel's brother.,"Genèse 4:1, 2","Genesis 4:1, 2",Vrai,True,Faux,False,,,,,2`
    const { payload, errors } = parseImportFile('tf.csv', csv)

    expect(errors).toEqual([])
    const question = payload.themes[0].questions[0]
    expect(question.source_text_fr).toBe('Genèse 4:1, 2')
    expect(question.options.map((o) => [o.name_fr, o.is_correct])).toEqual([
      ['Vrai', false],
      ['Faux', true],
    ])
    expect(detectQuestionType(question)).toBe('true_false')
  })

  it('strips the UTF-8 BOM so the first header is recognised', () => {
    const csv = `\uFEFF${HEADER}\n1,Hommes,Men,Qui ?,Who?,"Esdras 10:10, 11",,Asa,,Esdras,,,,,,2`
    const { payload, errors } = parseImportFile('bom.csv', csv)

    expect(errors).toEqual([])
    expect(payload.themes[0].level).toBe(1)
    expect(payload.themes[0].questions[0].source_text_fr).toBe('Esdras 10:10, 11')
  })

  it('rejects an out-of-range correct index', () => {
    const csv = `${HEADER}\n1,Hommes,,Qui ?,,,,A,,B,,,,,,3`
    expect(parseImportFile('bad.csv', csv).errors[0]).toMatch(/"correct" must be a number between 1 and 2/)
  })

  it('keeps same-named themes apart when their theme_key differs', () => {
    const csv =
      `${HEADER},theme_key\n` +
      `6,Vrai ou Faux,,Q1,,,,Vrai,,Faux,,,,,,1,jw-6\n` +
      `12,Vrai ou Faux,,Q2,,,,Vrai,,Faux,,,,,,1,jw-12\n`
    const { payload, warnings } = parseImportFile('keys.csv', csv)

    expect(payload.themes.map((t) => [t.key, t.level])).toEqual([
      ['jw-6', 6],
      ['jw-12', 12],
    ])
    expect(warnings[0]).toMatch(/stay separate/)
  })

  it('rejects a true_false question with more than 2 options', () => {
    const csv = `${HEADER},theme_key,type\n1,T,,Q,,,,A,,B,,C,,,,1,,true_false`
    expect(parseImportFile('tf3.csv', csv).errors).toContain(
      'Theme T, question #1: a true_false question needs exactly 2 options.'
    )
  })
})

describe('parseImportFile (JSON)', () => {
  it('parses a Vrai/Faux theme and detects its type', () => {
    const json = JSON.stringify({
      themes: [
        {
          key: 'jw-6',
          level: 6,
          name_fr: 'Vrai ou Faux',
          questions: [
            {
              name_fr: 'Jonas a été avalé par un grand poisson.',
              options: [
                { name_fr: 'Vrai', name_en: 'True', is_correct: true },
                { name_fr: 'Faux', name_en: 'False', is_correct: false },
              ],
            },
          ],
        },
      ],
    })
    const { payload, errors } = parseImportFile('tf.json', json)

    expect(errors).toEqual([])
    expect(payload.themes[0].key).toBe('jw-6')
    expect(detectQuestionType(payload.themes[0].questions[0])).toBe('true_false')
  })

  it('reports a missing themes array', () => {
    expect(parseImportFile('bad.json', '{"foo":1}').errors).toEqual(['JSON must be an object with a "themes" array.'])
  })

  it('accepts the bundled templates without errors', () => {
    expect(parseImportFile('t.json', JSON.stringify(JSON_TEMPLATE)).errors).toEqual([])
    expect(parseImportFile('t.csv', CSV_TEMPLATE).errors).toEqual([])
  })
})

describe('normalizeText', () => {
  it('ignores case, typographic apostrophes/quotes and spacing', () => {
    expect(normalizeText('Qui a fui en Égypte à cause d’Hérode ?')).toBe(
      normalizeText("qui a fui  en égypte à cause d'Hérode?")
    )
    expect(normalizeText('Jéhovah-Iré signifie « le Seigneur domine »')).toBe(
      normalizeText('Jéhovah-Iré signifie "le Seigneur domine"')
    )
    expect(normalizeText('Es-tu le roi des Juifs\u00a0?')).toBe(normalizeText('Es-tu le roi des Juifs?'))
  })
})

describe('resolveTheme', () => {
  const categories = [
    { id: 2, level: 1, source_key: null, translate: [{ locale: 'fr', name: 'hommes' }] },
    { id: 7, level: 6, source_key: 'jw-6', translate: [{ locale: 'fr', name: 'Vrai ou Faux' }] },
  ]

  it('matches by name when no key is given', () => {
    expect(resolveTheme({ name_fr: 'Hommes', questions: [] }, categories)?.id).toBe(2)
  })

  it('matches by key before name', () => {
    expect(resolveTheme({ key: 'jw-6', name_fr: 'Autre', questions: [] }, categories)?.id).toBe(7)
  })

  it('does not reuse a same-named theme that carries another key', () => {
    const theme = { key: 'jw-12', name_fr: 'Vrai ou Faux', questions: [] }
    expect(resolveTheme(theme, categories)).toBeUndefined()
    expect(findHomonyms(theme, categories).map((c) => c.id)).toEqual([7])
  })

  it('adopts an unkeyed theme by name when a key is given', () => {
    expect(resolveTheme({ key: 'jw-1', name_fr: 'Hommes', questions: [] }, categories)?.id).toBe(2)
  })
})

describe('toCsv', () => {
  it('quotes fields containing commas or quotes', () => {
    expect(toCsv([['Esdras 10:10, 11', 'dit "oui"', 'plain']])).toBe('"Esdras 10:10, 11","dit ""oui""",plain')
  })
})
