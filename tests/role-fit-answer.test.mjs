import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RoleFitAnswer } from '../src/features/role-fit/role-fit-answer.tsx'

function render(answer) {
  return renderToStaticMarkup(createElement(RoleFitAnswer, null, answer))
}

test('role-fit answer renders paragraphs and bold without literal markers', () => {
  const html = render('Henrique conecta **produto e engenharia**.\n\nAgende uma conversa.')
  assert.match(html, /<strong>produto e engenharia<\/strong>/)
  assert.equal((html.match(/<p>/g) ?? []).length, 2)
  assert.doesNotMatch(html, /\*\*/)
})

test('role-fit answer excludes generated links, images, and raw HTML', () => {
  const html = render(
    '[conversa](https://example.com) ![imagem](https://example.com/image.png)\n\n' +
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">',
  )
  assert.match(html, /conversa/)
  assert.doesNotMatch(html, /<(?:a|img|script|iframe)(?:\s|>)/)
  assert.doesNotMatch(html, /href=|src=|onerror=/)
})

test('role-fit answer does not render assessment headings or lists', () => {
  const html = render('# Resumo\n\n- Entrega de produto\n- **Arquitetura**')
  assert.match(html, /Resumo/)
  assert.match(html, /Entrega de produto/)
  assert.match(html, /<strong>Arquitetura<\/strong>/)
  assert.doesNotMatch(html, /<(?:h[1-6]|ul|ol|li)(?:\s|>)/)
})

test('role-fit answer accepts empty, partial, and plain text during reveal', () => {
  for (const answer of ['', 'Henrique trabalha com **produto', 'Experiência em aplicações.']) {
    assert.doesNotThrow(() => render(answer))
  }
  assert.match(render('Experiência em aplicações.'), /<p>Experiência em aplicações\.<\/p>/)
})

test('role-fit form preserves reveal, reduced motion, and scheduling', () => {
  const source = readFileSync(
    new URL('../src/features/role-fit/role-fit-form.tsx', import.meta.url),
    'utf8',
  )
  assert.match(source, /<RoleFitAnswer>\{visibleAnswer\}<\/RoleFitAnswer>/)
  assert.match(source, /ref=\{assessmentRef\}/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /const WORD_INTERVAL_MS = 24/)
  assert.match(source, /stabilizeViewportAnchor\(assessmentRef\.current, 24\)/)
  assert.match(source, /<section ref=\{assessmentRef\} className="mt-7 text-start"/)
  assert.doesNotMatch(source, /createStreamingScrollFollower|streamingScroll|stopStreamingScroll/)
  assert.match(source, /openAction\('schedule'\)/)
  assert.doesNotMatch(source, /closeAction\('fit'\)/)
  assert.match(source, /min-h-9 w-fit cursor-pointer !bg-black\/\[0\.07\]/)
  assert.doesNotMatch(source, /-ml-4 min-h-9 w-fit cursor-pointer/)
})
