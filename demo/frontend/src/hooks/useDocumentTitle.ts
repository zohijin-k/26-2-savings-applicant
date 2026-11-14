import { useEffect } from 'react'

/** 단계마다 다른 문서 제목을 넣는다. 화면을 떠날 때 이전 제목으로 되돌리지 않는다. */
export default function useDocumentTitle(title: string): void {
  useEffect(() => {
    if (title) document.title = title
  }, [title])
}
