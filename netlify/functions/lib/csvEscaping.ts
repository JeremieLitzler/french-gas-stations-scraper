// CSV field escaping for history.csv (issue #112, security-guidelines.md
// rule 2): guards against formula injection (a value opened in a
// spreadsheet app must never be interpreted as a formula) and against
// structural injection (a comma or quote inside a value must never split a
// row into extra fields).
const FORMULA_TRIGGER_CHARACTERS = /^[=+\-@]/
const NEEDS_QUOTING = /["\n\r,]/

export function toCsvField(value: string): string {
  const guarded = guardAgainstFormula(value)
  if (NEEDS_QUOTING.test(guarded)) return quote(guarded)
  return guarded
}

function guardAgainstFormula(value: string): string {
  if (FORMULA_TRIGGER_CHARACTERS.test(value)) return `'${value}`
  return value
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}
