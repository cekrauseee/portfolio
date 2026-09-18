import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

// Compile this client component as ESM, as Next does; the suite's TSX loader defaults to CJS.
const componentSource = readFileSync(
  new URL('../src/features/role-fit/role-fit-answer.tsx', import.meta.url),
  'utf8',
)
const { outputText } = ts.transpileModule(componentSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
})
const moduleSource = outputText
  .replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))
  .replaceAll("'streamdown'", JSON.stringify(import.meta.resolve('streamdown')))
  .replaceAll(
    "'@/lib/motion'",
    JSON.stringify(new URL('../src/lib/motion.ts', import.meta.url).href),
  )
const { RoleFitAnswer } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
)

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

test('role-fit form consumes live deltas and keeps scheduling after completion', () => {
  const source = readFileSync(
    new URL('../src/features/role-fit/role-fit-form.tsx', import.meta.url),
    'utf8',
  )
  assert.match(source, /for await \(const delta of readFitStream\(response.body\)\)/)
  assert.match(source, /words.push\(delta\)/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /createRoleFitRevealLayout\(rootRef\.current\)/)
  assert.match(source, /openAction\('schedule'\)/)
  assert.doesNotMatch(source, /visibleWordCount|stabilizeViewportAnchor/)
})

test('streaming words fade using the shared slower motion token', () => {
  const html = renderToStaticMarkup(
    createElement(RoleFitAnswer, { isStreaming: true }, 'Henrique builds **reliable software'),
  )
  assert.match(html, /data-sd-animate/)
  assert.match(html, /--sd-duration:300ms/)
  assert.doesNotMatch(html, /\*\*/)
  assert.match(html, /<strong>/)
  assert.doesNotMatch(html, /hidden|blurIn|slideUp/)
})
