/**
 * 진행 막대.
 * 값을 아는 작업은 `value`/`max`로 채우고, 끝을 알 수 없는 작업은 `indeterminate`로 흐르는 막대를 보여 준다.
 * `label`은 화면 낭독기가 읽는 이름이다. 화면에 보이는 문구는 쓰는 쪽에서 옆에 둔다.
 */
export default function ProgressBar({ value = 0, max = 100, label, indeterminate = false, valueText, className }: {
  value?: number
  max?: number
  label: string
  indeterminate?: boolean
  /** "7종 중 3종 완료"처럼 숫자 대신 읽어 줄 문구. */
  valueText?: string
  className?: string
}) {
  const safeMax = max > 0 ? max : 1
  const now = Math.min(Math.max(value, 0), safeMax)
  const classes = `progress${indeterminate ? ' progress--indeterminate' : ''}${className ? ` ${className}` : ''}`
  return (
    <span
      className={classes}
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : safeMax}
      aria-valuenow={indeterminate ? undefined : now}
      aria-valuetext={valueText}
    >
      <span className="progress__bar" style={indeterminate ? undefined : { width: `${(now / safeMax) * 100}%` }} />
    </span>
  )
}
