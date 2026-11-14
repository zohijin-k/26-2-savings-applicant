/** 안내 상자. 색만으로 구분하지 않도록 종류마다 아이콘이 함께 나온다. */
import type { ReactNode, Ref } from 'react'

import Icon, { type IconName } from './Icon.tsx'

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

const TONE_ICON: Record<NoticeTone, IconName> = {
  info: 'info',
  success: 'checkCircle',
  warning: 'alert',
  danger: 'alertCircle',
  neutral: 'info',
}

export default function Notice({ tone, title, icon, role, children, id, className, tabIndex, ref }: {
  tone: NoticeTone
  title?: ReactNode
  /** 기본 아이콘을 바꾸거나(`IconName`) 숨긴다(`false`). */
  icon?: IconName | false
  /** 상황에 따라 `alert` 또는 `status`. 정적인 안내에는 주지 않는다. */
  role?: 'alert' | 'status'
  children?: ReactNode
  id?: string
  className?: string
  /** 안내로 포커스를 옮겨야 할 때 `-1`을 준다. */
  tabIndex?: number
  ref?: Ref<HTMLDivElement>
}) {
  const shown = icon === false ? null : icon ?? TONE_ICON[tone]
  return (
    <div ref={ref} id={id} role={role} tabIndex={tabIndex} className={`notice notice--${tone}${className ? ` ${className}` : ''}`}>
      {shown && <Icon name={shown} className="notice__icon" />}
      <div className="notice__content">
        {title && <p className="notice__title">{title}</p>}
        {children != null && children !== false && <div className="notice__body">{children}</div>}
      </div>
    </div>
  )
}
