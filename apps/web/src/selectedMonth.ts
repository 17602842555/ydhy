// Shared "selected month" (YYYY-MM) persisted in localStorage so the task
// calendar fill page and the subcompany supervision board stay in sync: the
// month being filled in drives which month the board reports, across reloads
// and across browser tabs (the two are often opened side by side).
export const SELECTED_MONTH_STORAGE_KEY = 'huage:selected-month'

const MONTH_RE = /^\d{4}-\d{2}$/

export function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function isMonth(value: unknown): value is string {
  return typeof value === 'string' && MONTH_RE.test(value)
}

export function readSelectedMonth() {
  try {
    const stored = window.localStorage.getItem(SELECTED_MONTH_STORAGE_KEY)
    if (isMonth(stored)) return stored
  } catch {
    // Ignore storage access errors (private mode, disabled storage, etc.).
  }
  return currentMonth()
}

export function writeSelectedMonth(month: string) {
  if (!isMonth(month)) return
  try {
    window.localStorage.setItem(SELECTED_MONTH_STORAGE_KEY, month)
  } catch {
    // Ignore storage write errors.
  }
}
