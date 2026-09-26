const STORAGE_KEY = "biquiz-reported-questions"

export const reportedQuestionIds = (): number[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
    return Array.isArray(raw) ? raw.filter((id) => Number.isInteger(id)) : []
  } catch {
    return []
  }
}

export const rememberReportedQuestion = (id: number) => {
  const ids = reportedQuestionIds()
  if (ids.includes(id)) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id]))
}
