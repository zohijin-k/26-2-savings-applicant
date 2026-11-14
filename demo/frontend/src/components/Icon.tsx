/** 화면 공용 아이콘. 24칸 격자 위에 선으로만 그리며 글자색(currentColor)을 따른다. */
import type { ReactNode } from 'react'

export type IconName =
  | 'check' | 'checkCircle' | 'alert' | 'alertCircle' | 'info' | 'close'
  | 'chevronLeft' | 'chevronRight' | 'chevronDown' | 'external'
  | 'upload' | 'file' | 'fileDown' | 'eye' | 'refresh' | 'pencil' | 'trash'
  | 'clock' | 'phone' | 'printer' | 'lock' | 'user' | 'calendar' | 'minus' | 'plus'

const TRAY = 'M4.5 15v3A1.5 1.5 0 0 0 6 19.5h12a1.5 1.5 0 0 0 1.5-1.5v-3'

const SHAPES: Record<IconName, ReactNode> = {
  check: <path d="M5 12.5 9.5 17 19 7.5" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12.4 2.8 2.8L16 9.6" /></>,
  alert: <><path d="M12 3.8 2.8 19.7h18.4L12 3.8Z" /><path d="M12 10v4.5M12 17.2h.01" /></>,
  alertCircle: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V13M12 16.5h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5h.01" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevronLeft: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  chevronDown: <path d="M5.5 9 12 15.5 18.5 9" />,
  external: <path d="M13.5 4.5h6v6M19.5 4.5 11 13M17.5 13.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8A1.5 1.5 0 0 1 6 6.5h4.5" />,
  upload: <><path d="M12 15.5v-11M7.5 8.5 12 4l4.5 4.5" /><path d={TRAY} /></>,
  file: <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5Zm0 0v5h5" />,
  fileDown: <><path d="M12 4.5v11M7.5 11l4.5 4.5 4.5-4.5" /><path d={TRAY} /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  refresh: <path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9m0-4.5V9H15m4.5 3a7.5 7.5 0 0 1-12.8 5.3L4.5 15m0 4.5V15H9" />,
  pencil: <path d="m4.5 19.5 1-4.2L16.2 4.6a1.8 1.8 0 0 1 2.5 0l.7.7a1.8 1.8 0 0 1 0 2.5L8.7 18.5l-4.2 1Zm9.8-12.8 3 3" />,
  trash: <path d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 11.6a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7M10 11v5.5m4-5.5v5.5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 5 5.1a1.5 1.5 0 0 1 1.5-1.6Z" />,
  printer: <path d="M7 8.5V4h10v4.5M7 16.5H5.5A1.5 1.5 0 0 1 4 15v-5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 10v5a1.5 1.5 0 0 1-1.5 1.5H17m-10-3h10V20H7v-6.5Z" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="1.5" /><path d="M8 10.5v-3a4 4 0 0 1 8 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="15" rx="1.5" /><path d="M4 10h16M8 3.5v4m8-4v4" /></>,
  minus: <path d="M5.5 12h13" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
}

export default function Icon({ name, size = 20, className }: {
  name: IconName
  /** 한 변 길이(px). 기본 20. */
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[name]}
    </svg>
  )
}
