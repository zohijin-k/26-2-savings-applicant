/**
 * 진행 표시 고리.
 * `label`을 주면 글자와 함께 `role="status"`로 알리고, 주지 않으면 장식으로만 그린다.
 */
export default function Spinner({ label, small = false, labelHidden = false }: {
  label?: string
  small?: boolean
  /** 글자를 화면에는 숨기고 화면 낭독기에만 읽힌다. */
  labelHidden?: boolean
}) {
  const ring = <span className={small ? 'spinner spinner--sm' : 'spinner'} aria-hidden="true" />
  if (!label) return ring
  return (
    <span className="spinner-row" role="status">
      {ring}
      <span className={labelHidden ? 'sr-only' : undefined}>{label}</span>
    </span>
  )
}
