#!/usr/bin/env node
/*
 * 두배적금(26-2-savings-applicant)과 청년정책(26-2-youth) 신청자 화면의 공용 디자인 파일을 맞춘다.
 * 원본은 26-2-youth다. 공용 파일을 고칠 때는 26-2-youth에서 고친 뒤 이 스크립트로 복사한다.
 *
 *   node scripts/sync-shared-styles.mjs --to <다른 저장소의 demo/frontend>     원본 → 대상으로 복사
 *   node scripts/sync-shared-styles.mjs --check <다른 저장소의 demo/frontend>  두 저장소가 같은지 확인(다르면 종료 코드 1)
 *
 * brand.css는 사업마다 다르므로 복사하지 않는다. 대신 두 brand.css가 같은 변수 이름을 갖는지 확인한다.
 * 경로는 모두 demo/frontend 기준이다.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SHARED_FILES = [
  'src/styles/ui-tokens.css',
  'src/styles/tokens.css',
  'src/styles/base.css',
  'src/styles/components.css',
  'scripts/sync-shared-styles.mjs',
  'scripts/check-design-rules.mjs',
  '../../.trellis/spec/frontend/shared-design-rules.md',
]

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function brandNames(root) {
  const text = readFileSync(resolve(root, 'src/styles/brand.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  return [...text.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]).sort()
}

function main(argv) {
  const mode = argv[0]
  const other = argv[1] && resolve(argv[1])
  if (!['--to', '--check'].includes(mode) || !other) {
    console.error('사용법: node scripts/sync-shared-styles.mjs --to|--check <다른 저장소의 demo/frontend>')
    return 2
  }
  if (!existsSync(resolve(other, 'src/styles/brand.css'))) {
    console.error(`대상에 src/styles/brand.css가 없습니다: ${other}`)
    return 2
  }

  let differ = 0
  for (const file of SHARED_FILES) {
    const from = resolve(here, file)
    const to = resolve(other, file)
    const same = existsSync(to) && readFileSync(from).equals(readFileSync(to))
    if (same) continue
    if (mode === '--to') {
      mkdirSync(dirname(to), { recursive: true })
      copyFileSync(from, to)
      console.log(`복사함  ${file}`)
    } else {
      console.log(`다름    ${file}`)
      differ += 1
    }
  }

  const mine = brandNames(here).join(' ')
  const theirs = brandNames(other).join(' ')
  if (mine !== theirs) {
    console.log('다름    src/styles/brand.css 변수 이름(값은 달라도 되지만 이름은 같아야 합니다)')
    console.log(`  이쪽: ${mine}\n  저쪽: ${theirs}`)
    differ += 1
  }

  if (mode === '--check') console.log(differ ? `공용 파일 ${differ}건이 다릅니다.` : '공용 파일이 모두 같습니다.')
  return differ ? 1 : 0
}

process.exitCode = main(process.argv.slice(2))
