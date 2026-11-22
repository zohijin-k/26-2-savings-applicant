import Icon from './Icon.tsx'
import Spinner from './Spinner.tsx'
export type SavePhase = 'idle' | 'saving' | 'saved' | 'failed'
/** Acknowledged server writes only. Dirty consents take precedence over earlier successes. */
export default function SaveStatus({ phase, dirty = false }: { phase: SavePhase; dirty?: boolean }) {
  return <span role="status" aria-live="polite" aria-atomic="true" className="applicant-save-status">
    {phase === 'saving' ? <><Spinner /> 저장 중… 이 화면에서 기다려 주세요.</>
      : phase === 'failed' ? <><Icon name="alertCircle" /> 저장을 확인하지 못했습니다. 입력은 이 화면에 남아 있습니다. 다시 저장해 주세요.</>
      : dirty ? <><Icon name="info" /> 저장하지 않은 변경이 있습니다. 이동하려면 먼저 저장해 주세요.</>
      : phase === 'saved' ? <><Icon name="checkCircle" /> 서버에 저장했습니다.</> : '작성한 내용은 서식의 저장 버튼으로 저장해 주세요.'}
  </span>
}
