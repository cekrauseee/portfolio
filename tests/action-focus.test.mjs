import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const homeSource = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8')
const homeActionsSource = readFileSync(
  new URL('../src/components/home-actions.tsx', import.meta.url),
  'utf8',
)

test('homepage blur keeps the action container clear when its own action is open', () => {
  assert.match(
    homeSource,
    /\[data-action-background\]:not\(:focus-within\):not\(\[data-action-open=true\]\)\]:blur-\[1\.5px\]/,
  )
  assert.match(homeActionsSource, /data-action-background\s+data-action-open=\{active !== null\}/)
  assert.doesNotMatch(homeSource, /<div id="schedule" data-action-background/)
})

test('home action triggers stay sharp while another action is open', () => {
  assert.match(
    homeActionsSource,
    /active !== null && active !== action\.id && action\.href !== undefined \? 'opacity-35 blur-\[1\.5px\]' : 'blur-0 opacity-100'/,
  )
})
