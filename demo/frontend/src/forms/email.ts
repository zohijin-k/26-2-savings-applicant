const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/

export function normalizeEmail(value: string): string {
  return value.normalize('NFKC').trim()
}

export function isValidEmail(value: string): boolean {
  const asciiOnly = [...value].every(character => character.charCodeAt(0) <= 0x7f)
  return value.length > 0 && asciiOnly && EMAIL_PATTERN.test(value)
}

/** The email an incremental save may carry: the typed value once it is empty or valid, otherwise `previous`. */
export function savableEmail(typed: unknown, previous: string): string {
  if (typeof typed !== 'string') return previous
  const email = normalizeEmail(typed)
  return email === '' || isValidEmail(email) ? typed : previous
}

/**
 * Prepare a form for an incremental (per-edit) save. The backend rejects a nonempty malformed
 * email with 400, so while the address is still being typed the save carries the last savable
 * email instead; `savable` remembers it. Full flushes keep sending the typed form, so the backend
 * still validates the address before the applicant moves on.
 */
export function withSavableEmail<T extends { email: string }>(form: T, savable: { current: string }): T {
  const email = savableEmail(form.email, savable.current)
  savable.current = email
  return email === form.email ? form : { ...form, email }
}
