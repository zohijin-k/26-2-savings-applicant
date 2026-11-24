#!/usr/bin/env node
/*
 * 신청자 화면 CSS가 공용 스타일 규칙(.trellis/spec/frontend/shared-design-rules.md)을 지키는지 검사한다.
 * 두배적금 · 청년정책 저장소에 같은 파일로 둔다. demo/frontend에서 실행한다.
 *
 *   node scripts/check-design-rules.mjs
 *
 * 검사 항목
 *   1. 색 값(#hex · rgb() · hsl())은 토큰 파일(ui-tokens · tokens · brand)과 원본 서식 재현 규칙에만 쓴다.
 *   2. 글자 크기는 --fs-* 토큰으로 쓴다(px 직접 쓰기 금지). 원본 서식 재현 규칙은 예외.
 *   3. 모서리는 --radius-* 토큰(또는 0 · 50%)으로 쓴다. 원본 서식 재현 규칙은 예외.
 *   4. 화면 폭 기준은 600px · 900px만 쓴다.
 *   5. brand.css에 필요한 변수가 모두 있고, 주 색이 흰 바탕·옅은 바탕과 4.5:1 이상 대비된다.
 * 위반이 있으면 목록을 보여 주고 종료 코드 1로 끝난다.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'src')

/* 담당자 화면이 함께 있는 저장소(청년정책)는 신청자 쪽 CSS만 검사한다. */
const hasOfficer = existsSync(resolve(src, 'pages/officer'))
const SCOPE = hasOfficer
  ? ['src/styles', 'src/pages/applicant', 'src/forms/pdf-forms-workspace.css']
  : ['src']

/* 색 값을 써도 되는 파일: 토큰 정의 · 담당자/서식 재현용 옛 변수 · 원본 서식 인쇄 모양. */
const TOKEN_FILES = new Set(['src/styles/ui-tokens.css', 'src/styles/tokens.css', 'src/styles/brand.css', 'src/index.css', 'src/forms/form-sheet.css'])
/* 원본 서식 PDF를 그대로 재현하는 규칙. 문서 잉크 · 좌표 비율 글자 크기를 지켜야 하므로 예외다. */
const PDF_RULE = /\.pdf-form(__|\b)|\.form-sheet|\.sheet-/
const ALLOWED_WIDTHS = new Set([600, 601, 900, 901])

export const BRAND_VARS = [
  '--brand-5', '--brand-10', '--brand-20', '--brand-30', '--brand-40', '--brand-50', '--brand-60', '--brand-70', '--brand-80',
  '--brand-accent-1', '--brand-accent-2', '--brand-accent-3', '--brand-tint-a', '--brand-tint-b', '--brand-stripe', '--logo-h', '--logo-h-sm',
]

function cssFiles(path) {
  const full = resolve(root, path)
  if (!existsSync(full)) return []
  if (statSync(full).isFile()) return full.endsWith('.css') ? [full] : []
  return readdirSync(full).flatMap((name) => cssFiles(relative(root, resolve(full, name))))
}

/* 주석을 같은 길이의 공백으로 바꿔 줄 번호를 지킨 뒤, 블록을 따라가며 선언마다 (선택자, 속성, 값, 줄)을 낸다. */
function* declarations(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  const stack = []
  let start = 0
  const lineAt = (i) => clean.slice(0, i).split('\n').length
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i]
    if (ch === '{') {
      stack.push({ prelude: clean.slice(start, i).trim(), line: lineAt(start + (clean.slice(start, i).length - clean.slice(start, i).trimStart().length)) })
      start = i + 1
    } else if (ch === ';' || ch === '}') {
      const chunk = clean.slice(start, i)
      const colon = chunk.indexOf(':')
      if (colon > 0 && stack.length) {
        const prop = chunk.slice(0, colon).trim()
        const value = chunk.slice(colon + 1).trim()
        if (prop && !prop.includes('{')) {
          const offset = start + (chunk.length - chunk.trimStart().length)
          yield { prop, value, line: lineAt(offset), selectors: stack.map((s) => s.prelude) }
        }
      }
      if (ch === '}') stack.pop()
      start = i + 1
    }
  }
}

function* atRules(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  for (const m of clean.matchAll(/@media[^{]*/g)) yield { prelude: m[0], line: clean.slice(0, m.index).split('\n').length }
}

const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/
const problems = []
const report = (file, line, rule, detail) => problems.push(`${file}:${line}  [${rule}] ${detail}`)

for (const full of SCOPE.flatMap(cssFiles)) {
  const file = relative(root, full).split(sep).join('/')
  const text = readFileSync(full, 'utf8')
  const tokenFile = TOKEN_FILES.has(file)
  for (const d of declarations(text)) {
    const pdf = d.selectors.some((s) => PDF_RULE.test(s))
    const print = d.selectors.some((s) => s.startsWith('@media print'))
    if (!tokenFile && !pdf && !print && COLOR.test(d.value)) report(file, d.line, '색', `${d.prop}: ${d.value}`)
    if (tokenFile || pdf) continue
    if ((d.prop === 'font-size' || d.prop === 'font') && /\d(\.\d+)?px/.test(d.value.replace(/var\([^)]*\)/g, ''))) {
      report(file, d.line, '글자 크기', `${d.prop}: ${d.value}`)
    }
    if (/^border(-[a-z]+)*-radius$/.test(d.prop)) {
      const rest = d.value.replace(/var\([^)]*\)/g, '').replace(/\b0\b|50%|100%/g, '').trim()
      if (/\d/.test(rest)) report(file, d.line, '모서리', `${d.prop}: ${d.value}`)
    }
  }
  for (const at of atRules(text)) {
    for (const m of at.prelude.matchAll(/(?:max|min)-width:\s*(\d+)px/g)) {
      if (!ALLOWED_WIDTHS.has(Number(m[1]))) report(file, at.line, '화면 폭', at.prelude.trim())
    }
  }
}

/* brand.css: 필요한 변수와 명도 대비. */
const brandText = readFileSync(resolve(src, 'styles/brand.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const brand = Object.fromEntries([...brandText.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
for (const name of BRAND_VARS) if (!(name in brand)) report('src/styles/brand.css', 1, 'brand', `${name}가 없습니다`)
for (const name of Object.keys(brand)) if (!BRAND_VARS.includes(name)) report('src/styles/brand.css', 1, 'brand', `${name}는 공용 목록에 없는 이름입니다`)

function luminance(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const PAIRS = [['--brand-60', '#ffffff', '주 색 위 흰 글자'], ['--brand-70', '#ffffff', '누른 주 색 위 흰 글자'], ['--brand-60', '--brand-5', '옅은 바탕 위 주 색 글자'], ['--brand-60', '--brand-10', '선택 바탕 위 주 색 글자']]
for (const [fg, bg, what] of PAIRS) {
  const a = brand[fg] ?? fg
  const b = brand[bg] ?? bg
  if (!/^#[0-9a-f]{3,6}$/i.test(a) || !/^#[0-9a-f]{3,6}$/i.test(b)) continue
  const ratio = contrast(a, b)
  if (ratio < 4.5) report('src/styles/brand.css', 1, '대비', `${what} ${ratio.toFixed(2)}:1 (4.5:1 이상이어야 합니다)`)
}

if (problems.length) {
  console.log(problems.join('\n'))
  console.log(`\n스타일 규칙 위반 ${problems.length}건`)
  process.exitCode = 1
} else {
  console.log('스타일 규칙 위반이 없습니다.')
}
