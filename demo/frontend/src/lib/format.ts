/**
 * 화면 표시용 서식 함수. 알아볼 수 없는 입력은 바꾸지 않고 그대로 돌려준다.
 * (브라우저·Node 어디서나 같은 결과가 나오도록 시간대 변환이 필요한 경우 외에는 Date를 쓰지 않는다.)
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/
const ZONED_DATE_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/

function isCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= days[month - 1]
}

function dateText(year: number, month: number, day: number): string {
  return `${year}. ${month}. ${day}.`
}

function timeText(hour: number, minute: number): string {
  const half = hour < 12 ? '오전' : '오후'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${half} ${hour12}:${String(minute).padStart(2, '0')}`
}

/** `'2026-03-03'` → `'2026. 3. 3.'` */
export function formatDate(value: string): string {
  const match = typeof value === 'string' ? DATE_ONLY.exec(value.trim()) : null
  if (!match) return value
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  return isCalendarDate(year, month, day) ? dateText(year, month, day) : value
}

/**
 * `'2026-11-14T00:35:10'` → `'2026. 11. 14. 오전 12:35'`
 * 시간대 표시가 없는 값은 적힌 시각 그대로, `Z`나 `+09:00`이 붙은 값은 보는 기기의 시간대로 바꿔 보여 준다.
 * 날짜만 있으면 `formatDate`와 같다.
 */
export function formatDateTime(value: string): string {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (DATE_ONLY.test(text)) return formatDate(text)

  const local = LOCAL_DATE_TIME.exec(text)
  if (local) {
    const [year, month, day, hour, minute] = local.slice(1).map(Number)
    if (!isCalendarDate(year, month, day) || hour > 23 || minute > 59) return value
    return `${dateText(year, month, day)} ${timeText(hour, minute)}`
  }

  if (ZONED_DATE_TIME.test(text)) {
    const date = new Date(text.replace(' ', 'T'))
    if (Number.isNaN(date.getTime())) return value
    return `${dateText(date.getFullYear(), date.getMonth() + 1, date.getDate())} ${timeText(date.getHours(), date.getMinutes())}`
  }
  return value
}

/** `1258291` → `'1.2MB'`. 1KB 미만은 `B`, 1MB 미만은 정수 `KB`, 그 위는 소수 한 자리(`.0`은 생략). */
export function formatBytes(bytes: number): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return String(bytes)
  if (bytes < 1024) return `${Math.round(bytes)}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  const [amount, unit] = bytes < 1024 ** 3 ? [bytes / 1024 ** 2, 'MB'] : [bytes / 1024 ** 3, 'GB']
  return `${amount.toFixed(1).replace(/\.0$/, '')}${unit}`
}

/** `12` → `'약 12초'`, `60` → `'약 1분'`. 1분 이상은 분 단위로 반올림한다. */
export function formatDuration(seconds: number): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return String(seconds)
  if (seconds < 60) return `약 ${Math.max(1, Math.round(seconds))}초`
  return `약 ${Math.round(seconds / 60)}분`
}
