const BOOKS_FR = [
  "Genèse", "Exode", "Lévitique", "Nombres", "Deutéronome", "Josué", "Juges", "Ruth", "1 Samuel",
  "2 Samuel", "1 Rois", "2 Rois", "1 Chroniques", "2 Chroniques", "Esdras", "Néhémie", "Esther", "Job",
  "Psaumes", "Proverbes", "Ecclésiaste", "Chant de Salomon", "Isaïe", "Jérémie", "Lamentations",
  "Ézéchiel", "Daniel", "Osée", "Joël", "Amos", "Abdias", "Jonas", "Michée", "Nahoum", "Habacuc",
  "Sophonie", "Aggée", "Zacharie", "Malachie", "Matthieu", "Marc", "Luc", "Jean", "Actes", "Romains",
  "1 Corinthiens", "2 Corinthiens", "Galates", "Éphésiens", "Philippiens", "Colossiens",
  "1 Thessaloniciens", "2 Thessaloniciens", "1 Timothée", "2 Timothée", "Tite", "Philémon", "Hébreux",
  "Jacques", "1 Pierre", "2 Pierre", "1 Jean", "2 Jean", "3 Jean", "Jude", "Apocalypse",
]

const BOOKS_EN = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel",
  "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
  "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
  "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
]

const ALIASES: Record<string, Record<string, string>> = {
  fr: { Psaume: "Psaumes", Génesis: "Genèse", Êxodo: "Exode", Ezra: "Esdras", Atos: "Actes", Lucas: "Luc" },
  en: { Psalm: "Psalms", Génesis: "Genesis", Êxodo: "Exodus", Atos: "Acts", Lucas: "Luke" },
}

function bookList(lang: string): { name: string; number: number }[] {
  const books = lang === "fr" ? BOOKS_FR : BOOKS_EN
  const names = new Map(books.map((name, index) => [name, index + 1]))
  for (const [alias, canonical] of Object.entries(ALIASES[lang === "fr" ? "fr" : "en"])) {
    const number = names.get(canonical)
    if (number) names.set(alias, number)
  }
  return [...names.entries()]
    .map(([name, number]) => ({ name, number }))
    .sort((a, b) => b.name.length - a.name.length)
}

/** wol.jw.org chapter URL for a reference such as "Esdras 10:10, 11". Null when no book is recognised. */
export function scriptureUrl(reference: string, lang: string): string | null {
  const text = reference.trim()
  const book = bookList(lang).find((entry) => text === entry.name || text.startsWith(`${entry.name} `))
  if (!book) return null

  const rest = text.slice(book.name.length).trim()
  const chapter = /^(\d+)/.exec(rest)
  if (!chapter) return null

  const verse = /^(\d+)[:.](\d+)/.exec(rest)
  const base = lang === "fr"
    ? "https://wol.jw.org/fr/wol/b/r30/lp-f/nwtsty"
    : "https://wol.jw.org/en/wol/b/r1/lp-e/nwtsty"
  const url = `${base}/${book.number}/${chapter[1]}`
  return verse ? `${url}#v=${book.number}:${chapter[1]}:${verse[2]}` : url
}
