export const ACTIVE_APPLICATION_KEY = 'applicant.activeApplicationId'

// Explicit new starts invalidate pending work from the previous application.
let applicationGeneration = 0
export function currentApplicationGeneration(): number {
  return applicationGeneration
}

const NAVIGATION_PARAMS = [
  'mode', 'application', 'stage', 'previous', 'from',
  'o_role', 'o_region', 'o_town', 'o_program', 'o_status', 'o_ai_status',
  'o_submitted_from', 'o_submitted_to', 'o_sort', 'o_page', 'o_page_size',
  'o_open', 'o_slot', 'o_criteria', 'o_criteria_program',
  'role', 'region', 'town', 'program', 'status', 'ai', 'submitted_from',
  'submitted_to', 'sort', 'page', 'page_size', 'slot',
] as const

export function currentParams(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}

export function routeUrl(path: string, params: Record<string, string | null> = {}, replace = false): void {
  const url = new URL(window.location.href)
  url.pathname = path
  for (const key of NAVIGATION_PARAMS) url.searchParams.delete(key)
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }
  if (url.href === window.location.href) {
    if (window.history.state?.applicantIndex === undefined) window.history.replaceState({ ...window.history.state, applicantIndex: 0 }, '', window.location.href)
    window.dispatchEvent?.(new Event('applicant:route'))
    return
  }
  const index = Number(window.history.state?.applicantIndex ?? 0)
  if (window.history.state?.applicantIndex === undefined) window.history.replaceState({ ...window.history.state, applicantIndex: index }, '', window.location.href)
  const method = replace ? 'replaceState' : 'pushState'
  window.history[method]({ ...window.history.state, applicantIndex: replace ? index : index + 1 }, '', `${url.pathname}${url.search}${url.hash}`)
  window.dispatchEvent?.(new Event('applicant:route'))
}

export function goToHome(): void {
  applicationGeneration += 1
  try { window.sessionStorage.removeItem(ACTIVE_APPLICATION_KEY) } catch { /* A remount still starts a fresh in-memory application. */ }
  routeUrl('/apply/identity')
}
