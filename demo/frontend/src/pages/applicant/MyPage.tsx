/**
 * 마이페이지 (계획서 3.1절 [7]).
 *
 *   · 진행 상태 5단계: 접수 → 서류검토 → 자격심사 → 선정심사 → 결과발표
 *   · 올린 서류와 확인된 내용 재확인
 *   · 동의 이력 (수기 서명 없이도 '누가 언제 무엇에 동의했는지'가 남는다)
 *
 * 주의: **심사 점수를 표시하지 않는다** (R5.3 / 공고문 "평가결과는 공개하지 않음").
 *    서버 응답(`/status`)에 애초에 점수가 없고, 이 화면도 점수를 계산하지 않는다.
 *    점수 표시를 추가해 달라는 요청이 오면 공고문 문구를 먼저 확인할 것.
 *
 * 단계 표식(.step-marker)과 항목 목록(.fact-list)의 모양은 신청 화면 틀(apply-flow.css)과 함께 쓴다.
 */

import { useEffect, useState } from 'react'

import { fetchStatus, type ApplicationStatus } from '../../api.ts'
import FileLink from '../../components/FileLink.tsx'
import Icon from '../../components/Icon.tsx'
import Notice from '../../components/Notice.tsx'
import PhoneLink from '../../components/PhoneLink.tsx'
import StatusBadge from '../../components/StatusBadge.tsx'
import { Skeleton, SkeletonLine } from '../../components/Skeleton.tsx'
import useDelayedFlag from '../../hooks/useDelayedFlag.ts'
import { friendlyError } from '../../lib/error-copy.ts'
import { formatDate, formatDateTime } from '../../lib/format.ts'
import './my-page.css'

const LOAD_ERROR_COPY = '신청 내용을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'

type ProgressState = ApplicationStatus['progress'][number]['state']

/** 진행 단계의 상태는 색과 함께 글자로도 알린다. */
const PROGRESS_STATE: Record<ProgressState, { marker: 'complete' | 'current' | 'waiting'; text: string }> = {
  done: { marker: 'complete', text: '완료' },
  current: { marker: 'current', text: '진행 중' },
  todo: { marker: 'waiting', text: '예정' },
}

export default function MyPage({ applicationId }: { applicationId: number }) {
  const [data, setData] = useState<ApplicationStatus | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const showSkeleton = useDelayedFlag(!data && !error)

  useEffect(() => {
    let active = true
    fetchStatus(applicationId)
      .then((status) => {
        if (active) setData(status)
      })
      .catch((e: unknown) => {
        if (active) setError(friendlyError(e, LOAD_ERROR_COPY))
      })
    return () => {
      active = false
    }
  }, [applicationId, attempt])

  const retry = () => {
    setError('')
    setAttempt((value) => value + 1)
  }

  const draft = data?.status === 'draft'

  return (
    <div className="mypage">
      <section className="card mypage__head" aria-labelledby="mypage-title">
        <h2 id="mypage-title" tabIndex={-1}>마이페이지</h2>
        {data && (
          <>
            <p className="mypage__program">{data.program_name}</p>
            <dl className="dl-inline">
              <div>
                <dt>신청번호</dt>
                <dd>{data.application_no}</dd>
              </div>
              {data.submitted_at && (
                <div>
                  <dt>접수 일시</dt>
                  <dd>{formatDateTime(data.submitted_at)}</dd>
                </div>
              )}
              {data.call_center && (
                <div>
                  <dt>문의</dt>
                  <dd><PhoneLink number={data.call_center} /></dd>
                </div>
              )}
            </dl>
          </>
        )}
      </section>

      {error && (
        <Notice tone="danger" role="alert" title="마이페이지를 열지 못했습니다">
          <p>{error}</p>
          <button type="button" className="btn btn--small" onClick={retry}>
            <Icon name="refresh" size={18} />
            다시 시도
          </button>
        </Notice>
      )}

      {!data && !error && showSkeleton && (
        <Skeleton className="mypage__skeleton" label="신청 내용을 불러오는 중">
          {[0, 1].map((card) => (
            <div className="card mypage__skeleton-card" key={card}>
              <SkeletonLine width="32%" />
              <SkeletonLine width="88%" />
              <SkeletonLine width="64%" />
            </div>
          ))}
        </Skeleton>
      )}

      {data && (
        <>
          {draft && (
            <Notice tone="info" title="아직 제출하지 않은 신청입니다.">
              신청 화면으로 돌아가 서식 작성과 서류 업로드를 마친 뒤 제출해 주세요. 제출하면 이곳에서 진행 상황을 확인할 수 있습니다.
            </Notice>
          )}

          <section className="card mypage__section" aria-labelledby="mypage-progress-title">
            <h3 id="mypage-progress-title">진행 상황</h3>
            <ol className="mypage__progress">
              {data.progress.map((step, index) => {
                const { marker, text } = PROGRESS_STATE[step.state] ?? PROGRESS_STATE.todo
                return (
                  <li key={step.label} className={`mpstep is-${marker}`} aria-current={step.state === 'current' ? 'step' : undefined}>
                    <span className={`step-marker step-marker--${marker}`} aria-hidden="true">
                      {marker === 'complete' ? <Icon name="check" size={18} /> : marker === 'waiting' ? index + 1 : null}
                    </span>
                    <span className="mpstep__copy">
                      <span className="mpstep__label">{step.label}</span>
                      <span className="mpstep__state">{text}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
            {data.result_notice && <Notice tone="neutral">{data.result_notice}</Notice>}
          </section>

          {/* 설정된 보완 기한과 확인할 서류를 안내한다. */}
          {data.supplement && (
            <Notice
              tone={data.supplement.expired ? 'danger' : 'warning'}
              icon="clock"
              title={data.supplement.expired ? '서류 보완 기한이 지났습니다' : `서류 보완 기한이 ${data.supplement.days_left}일 남았습니다`}
            >
              <p>
                보완 기한 {formatDateTime(data.supplement.deadline)}
                {!data.supplement.expired && ` (약 ${data.supplement.hours_left}시간 남음)`}
              </p>
              <p>{data.supplement.notice}</p>
              {data.supplement.targets.length > 0 && (
                <ul>
                  {data.supplement.targets.map((target) => (
                    <li key={`${target.label}:${target.reason}`}>
                      <strong>{target.label}</strong> — {target.reason}
                    </li>
                  ))}
                </ul>
              )}
            </Notice>
          )}

          <section className="card mypage__section" aria-labelledby="mypage-docs-title">
            <h3 id="mypage-docs-title">{draft ? '올린 서류' : '제출한 서류'}</h3>
            {data.documents.length === 0 ? (
              <p className="mypage__empty">아직 올린 서류가 없습니다.</p>
            ) : (
              <table className="mypage__docs">
                <thead>
                  <tr>
                    <th scope="col">파일</th>
                    <th scope="col">서류 종류</th>
                    <th scope="col">상태</th>
                    <th scope="col">확인된 내용</th>
                  </tr>
                </thead>
                <tbody>
                  {data.documents.map((doc) => {
                    const extracted = Object.entries(doc.extracted)
                    return (
                      <tr key={doc.document_id}>
                        <td data-label="파일">
                          <FileLink url={doc.file_url} name={doc.file_name} format={doc.file_format} />
                        </td>
                        <td data-label="서류 종류">{doc.detected_doc_type ?? '확인 전'}</td>
                        <td data-label="상태">
                          <StatusBadge status={doc.status ?? 'UPLOADED'} />
                        </td>
                        <td data-label="확인된 내용">
                          {extracted.length > 0 ? (
                            <dl className="dl-inline">
                              {extracted.map(([term, value]) => (
                                <div key={term}>
                                  <dt>{term}</dt>
                                  <dd>{formatDate(value)}</dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <span className="mypage__none">없음</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section className="card mypage__section" aria-labelledby="mypage-consents-title">
            <h3 id="mypage-consents-title">동의 이력</h3>
            {data.consents.length === 0 ? (
              <p className="mypage__empty">아직 동의한 항목이 없습니다.</p>
            ) : (
              <ul className="mypage__consents">
                {data.consents.map((consent) => (
                  <li key={consent.consent_type}>
                    <span className="mypage__consent-label">{consent.label}</span>
                    <span className={consent.agreed ? 'badge badge--success' : 'badge badge--neutral'}>
                      <Icon name={consent.agreed ? 'check' : 'minus'} size={16} />
                      {consent.agreed ? '동의함' : '동의하지 않음'}
                    </span>
                    <span className="mypage__time">
                      {formatDateTime(consent.agreed_at)}
                      {consent.signature_kind === 'electronic' && ' · 전자서명'}
                      {consent.signature_kind === 'handwritten' && ' · 자필서명 스캔'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
