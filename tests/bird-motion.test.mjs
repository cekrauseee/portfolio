import assert from 'node:assert/strict'
import test from 'node:test'
import {
  advanceBird,
  birdAttention,
  birdMargin,
  birdReadingPerch,
  boundBird,
  noticeBirdPointer,
} from '../src/lib/bird-motion.ts'

test('isolated cursor nudges only attract attention; sustained movement starts following', () => {
  let pointer = noticeBirdPointer(null, { x: 100, y: 100 }, 0)
  assert.equal(pointer.engaged, false)
  pointer = noticeBirdPointer(pointer, { x: 104, y: 102 }, 200)
  assert.equal(pointer.engaged, false, 'a small bump should leave the bird on its branch')
  pointer = noticeBirdPointer(pointer, { x: 180, y: 130 }, 650)
  assert.equal(pointer.engaged, false, 'separated movements must not accumulate intent')
  pointer = noticeBirdPointer(pointer, { x: 210, y: 160 }, 740)
  assert.equal(pointer.engaged, false, 'the bird looks before taking off')
  pointer = noticeBirdPointer(pointer, { x: 240, y: 180 }, 850)
  assert.equal(pointer.engaged, false, 'attention now lasts slightly longer than 200ms')
  pointer = noticeBirdPointer(pointer, { x: 250, y: 185 }, 960)
  assert.equal(pointer.engaged, true)
  pointer = noticeBirdPointer(pointer, { x: 242, y: 181 }, 1100)
  assert.equal(pointer.engaged, true, 'following stays responsive once intent is established')
  pointer = noticeBirdPointer(pointer, { x: 500, y: 300 }, 2200)
  assert.equal(pointer.engaged, false, 'returning after inactivity starts with attention again')
})

test('narration keeps its perch through word gaps and stays in the reading band during scroll', () => {
  const bounds = { left: 2, right: 900, top: 8, bottom: 808 }
  let y = birdReadingPerch(330, 40, 48, bounds)
  assert.equal(y, 284)
  for (const wordBottom of [null, 330, null, 330]) {
    y = birdReadingPerch(wordBottom, y, 48, bounds)
    assert.equal(y, 284, 'gaps must not send the bird back to a heading')
  }
  const scrolled = birdReadingPerch(-100, y, 48, bounds)
  const nextParagraph = birdReadingPerch(600, scrolled, 48, bounds)
  assert.equal(scrolled, 216)
  assert.equal(nextParagraph, 328)
})

test('the bird fits the text gutter and remains above the reading controls on mobile', () => {
  const { size, bounds, perches } = birdMargin(32, 320, 568, 0, 80)
  const position = boundBird({ x: 500, y: 900 }, bounds)
  assert.ok(position.x >= 0 && position.x + size <= 320)
  assert.ok(perches.left >= 0 && perches.left + size <= 32)
  assert.ok(perches.right >= 320 - 32 && perches.right + size <= 320)
  assert.ok(position.y + size <= 568 - 80)
  assert.ok(
    birdMargin(32, 320, 568).bounds.bottom > bounds.bottom,
    'the home page has no reading toolbar exclusion',
  )
  const keyboard = birdMargin(32, 320, 240, 120)
  assert.ok(boundBird({ x: -50, y: -100 }, keyboard.bounds).y >= 120)
})

test('flight keeps its momentum when interrupted and settles at the new destination', () => {
  let bird = { x: 40, y: 40, vx: 0, vy: 0 }
  for (let frame = 0; frame < 8; frame++) {
    bird = advanceBird(bird, { x: 120, y: 400 }, 1 / 60)
  }
  const before = bird
  bird = advanceBird(bird, { x: 40, y: 40 }, 1 / 240)
  assert.ok(bird.y > before.y, 'reversing the target must not instantly reverse velocity')
  assert.ok(Math.abs(bird.y - before.y) < 10, 'no teleport at an interruption')
  for (let frame = 0; frame < 300; frame++) {
    bird = advanceBird(bird, { x: 40, y: 40 }, 1 / 60)
  }
  assert.ok(Math.hypot(bird.x - 40, bird.y - 40, bird.vx, bird.vy) < 0.01)
})

test('pointer inactivity and scrolling release attention back to the page', () => {
  const pointer = { x: 1900, y: 500, at: 1000 }
  assert.equal(birdAttention(pointer, 1100, 0), pointer)
  assert.equal(
    birdAttention(pointer, 2300, 0),
    null,
    'a stale pointer cannot pin the bird to an edge',
  )
  assert.equal(birdAttention(null, 1100, 0), null, 'leaving the window discards pointer attention')
  assert.equal(
    birdAttention(pointer, 1100, 1400),
    null,
    'scrolling takes priority over mouse following',
  )
})

test('crossing the page has a gradual takeoff instead of completing on the UI clock', () => {
  let bird = { x: 200, y: 100, vx: 0, vy: 0 }
  for (let frame = 0; frame < 24; frame++) {
    bird = advanceBird(bird, { x: 800, y: 100 }, 1 / 60, true)
  }
  assert.ok(bird.x > 550 && bird.x < 740, 'the bird should still be crossing after 400ms')
  for (let frame = 0; frame < 156; frame++) {
    bird = advanceBird(bird, { x: 800, y: 100 }, 1 / 60, true)
  }
  assert.ok(Math.abs(bird.x - 800) < 0.1)
  const following = advanceBird({ x: 200, y: 100, vx: 0, vy: 0 }, { x: 200, y: 500 }, 0.3)
  assert.ok(following.y > 430, 'same-side following must remain responsive')
})

test('the same flight takes the same time at different display refresh rates', () => {
  function simulate(hz) {
    let bird = { x: 0, y: 0, vx: 0, vy: 0 }
    for (let frame = 0; frame < hz / 2; frame++) {
      bird = advanceBird(bird, { x: 100, y: 300 }, 1 / hz)
    }
    return bird
  }
  const slow = simulate(30)
  const fast = simulate(120)
  assert.ok(Math.abs(slow.y - fast.y) < 0.001)
  assert.ok(Math.abs(slow.vy - fast.vy) < 0.001)
})
