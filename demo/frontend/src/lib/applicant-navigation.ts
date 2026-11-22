type LeaveAction = () => void
let handler: ((action: LeaveAction) => void) | null = null
export function requestApplicantLeave(action: LeaveAction): void { if (handler) handler(action); else action() }
export function registerApplicantLeave(next: (action: LeaveAction) => void): () => void {
  handler = next
  return () => { if (handler === next) handler = null }
}

let historyHandler: ((event: PopStateEvent) => boolean) | null = null
export function handleApplicantHistory(event: PopStateEvent): boolean { return historyHandler?.(event) ?? false }
export function registerApplicantHistory(next: (event: PopStateEvent) => boolean): () => void {
  historyHandler = next
  return () => { if (historyHandler === next) historyHandler = null }
}
