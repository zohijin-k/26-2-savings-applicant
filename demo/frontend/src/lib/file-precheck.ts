/**
 * 올리기 전 화면에서 하는 파일 검사.
 *
 * 서버가 받아 줄 파일은 막지 않는다. 서버가 확장자로 거절할 형식, 내용이 없는 파일,
 * 암호가 걸린 PDF만 요청을 보내기 전에 그 칸에서 알려 준다.
 * PDF를 여는 도구는 밖에서 넣어 준다(이 파일은 브라우저 전용 모듈을 불러오지 않는다).
 */

/** 예상 시간을 가르는 파일 종류: 글자가 들어 있는 PDF · 스캔(그림) PDF · 사진. */
export type FileKind = 'pdf-text' | 'pdf-scan' | 'image'

export type PrecheckFailure = 'format' | 'heic' | 'empty' | 'encrypted'

export type Precheck =
  | { ok: true; kind: FileKind; pages: number | null; previewUrl: string; hint?: string }
  | { ok: false; reason: PrecheckFailure; message: string }

/** PDF를 열어 쪽수와 첫 쪽에 글자가 들어 있는지를 알려 준다. 암호가 걸려 있으면 `PasswordException`으로 거절한다. */
export type PdfProbe = (file: File) => Promise<{ pages: number; hasText: boolean }>

/** 서버가 확장자로 받는 형식. */
export const ACCEPTED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const

export const PRECHECK_MESSAGES: Record<PrecheckFailure, string> = {
  format: 'PDF, JPG, PNG 파일만 올릴 수 있습니다. 서류를 PDF로 저장하거나 JPG로 바꿔 다시 선택해 주세요.',
  heic: '아이폰 사진(HEIC) 형식은 올릴 수 없습니다. 사진을 JPG로 바꾸거나, 발급처에서 PDF로 받아 올려 주세요.',
  empty: '파일 내용이 비어 있습니다. 파일을 다시 저장한 뒤 선택해 주세요.',
  encrypted: '암호가 걸린 PDF입니다. 암호를 해제한 파일을 올려 주세요.',
}

/** 이 크기부터는 시간이 더 걸릴 수 있다고만 알린다. 크기로 막지는 않는다. */
export const LARGE_FILE_BYTES = 20 * 1024 * 1024
export const LARGE_FILE_HINT = '파일이 커서 시간이 더 걸릴 수 있습니다.'

/** 파일 이름의 마지막 확장자(소문자). 없으면 빈 문자열. 서버와 같은 기준이다. */
export function fileExtension(name: string): string {
  const base = name.slice(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1)
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
}

export function isPasswordError(err: unknown): boolean {
  return err !== null && typeof err === 'object' && (err as { name?: unknown }).name === 'PasswordException'
}

function failure(reason: PrecheckFailure): Precheck {
  return { ok: false, reason, message: PRECHECK_MESSAGES[reason] }
}

/**
 * @param pdf PDF를 여는 도구. 암호 오류가 아닌 실패는 모두 통과로 본다.
 * @param previewUrl 이미 만들어 둔 미리보기 주소가 있으면 그대로 쓴다. 없으면 여기서 만든다.
 */
export async function precheckFile(file: File, pdf: PdfProbe, previewUrl?: string): Promise<Precheck> {
  const extension = fileExtension(file.name)
  if (extension === 'heic' || extension === 'heif') return failure('heic')
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(extension)) return failure('format')
  if (file.size === 0) return failure('empty')

  let kind: FileKind = 'image'
  let pages: number | null = null
  if (extension === 'pdf') {
    kind = 'pdf-scan'
    try {
      const probed = await pdf(file)
      if (Number.isInteger(probed.pages) && probed.pages > 0) {
        pages = probed.pages
        kind = probed.hasText ? 'pdf-text' : 'pdf-scan'
      }
    } catch (err: unknown) {
      if (isPasswordError(err)) return failure('encrypted')
      // 열어 보지 못한 까닭이 암호가 아니면 서버 확인에 맡긴다.
    }
  }

  const ok: Precheck = { ok: true, kind, pages, previewUrl: previewUrl ?? URL.createObjectURL(file) }
  if (file.size >= LARGE_FILE_BYTES) ok.hint = LARGE_FILE_HINT
  return ok
}
