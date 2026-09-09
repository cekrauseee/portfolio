import assert from "node:assert/strict";
import test from "node:test";
import {
  animateLocaleLayout,
  readLocaleLayout,
} from "../src/i18n/locale-layout.ts";

function block(parentElement = null) {
  return {
    parentElement,
    matches: () => false,
    animate: (keyframes, options) => ({ keyframes, options }),
  };
}

test("growing and shrinking copy moves blocks vertically without scaling them", () => {
  const section = block();
  for (const [before, after, expected] of [
    [100, 140, -40],
    [140, 100, 40],
  ]) {
    const animations = animateLocaleLayout(
      new Map([[section, before]]),
      new Map([[section, after]]),
    );
    assert.equal(animations.length, 1);
    assert.deepEqual(animations[0].keyframes, [
      { translate: `0 ${expected}px` },
      { translate: "0 0" },
    ]);
    assert.deepEqual(animations[0].options, {
      duration: 220,
      easing: "ease-out",
      composite: "add",
    });
  }
});

test("nested blocks move only by the displacement not supplied by their parent", () => {
  const parent = block();
  const child = block(parent);
  const unchangedLocal = block(parent);
  const before = new Map([
    [parent, 100],
    [child, 130],
    [unchangedLocal, 160],
  ]);
  const after = new Map([
    [parent, 140],
    [child, 190],
    [unchangedLocal, 200],
  ]);
  const animations = animateLocaleLayout(before, after);
  assert.equal(animations.length, 2);
  assert.equal(animations[0].keyframes[0].translate, "0 -40px");
  assert.equal(animations[1].keyframes[0].translate, "0 -20px");
});

test("viewport scrolling does not create layout motion in content coordinates", () => {
  let scroll = 0;
  const section = {
    ...block(),
    getBoundingClientRect: () => ({ top: 100 - scroll }),
  };
  const root = {
    getBoundingClientRect: () => ({ top: -scroll }),
    querySelector: () => null,
    querySelectorAll: (selector) => {
      assert.match(selector, /:not\(footer\)/);
      return [section];
    },
  };
  const before = readLocaleLayout(root);
  scroll = 80;
  const after = readLocaleLayout(root);
  assert.equal(before.get(section), 100);
  assert.deepEqual(after, before);
  assert.deepEqual(animateLocaleLayout(before, after), []);
});

test("new blocks and subpixel noise do not create spurious motion", () => {
  const existing = block();
  const added = block();
  assert.deepEqual(
    animateLocaleLayout(
      new Map([[existing, 100]]),
      new Map([
        [existing, 100.2],
        [added, 200],
      ]),
    ),
    [],
  );
});

test("expanded copy preserves the old viewport position around the anchored footer", () => {
  let expansion = 0;
  let scroll = 0;
  const project = {
    ...block(),
    getBoundingClientRect: () => ({ top: 200 - scroll }),
  };
  const following = {
    ...block(),
    getBoundingClientRect: () => ({ top: 1200 + expansion - scroll }),
  };
  const footer = {
    getBoundingClientRect: () => ({ top: 1500 + expansion - scroll }),
  };
  const root = {
    getBoundingClientRect: () => ({ top: -scroll }),
    querySelector: () => footer,
    querySelectorAll: () => [project, following],
  };
  const before = readLocaleLayout(root);
  for (const heightChange of [900, -500]) {
    expansion = heightChange;
    // The selector's scroll correction must not become an extra FLIP delta.
    scroll = heightChange;
    const after = readLocaleLayout(root);
    // The footer remains on screen because scroll tracks the height change.
    // Content above the expansion moves; content below it stays on screen.
    assert.equal(before.get(project) - after.get(project), heightChange);
    assert.equal(after.get(following), before.get(following));
    const animations = animateLocaleLayout(before, after);
    assert.equal(animations.length, 1);
    assert.equal(animations[0].keyframes[0].translate, `0 ${heightChange}px`);
  }
});

test("expanded panel growth keeps its lower boundary stable without moving internal text", () => {
  let growth = 0;
  let scroll = 0;
  const section = {
    ...block(),
    getBoundingClientRect: () => ({ top: 100 - scroll }),
  };
  const article = {
    ...block(section),
    matches: (selector) => selector.startsWith("article:has("),
    getBoundingClientRect: () => ({
      top: 400 - scroll,
      bottom: 1100 + growth - scroll,
    }),
  };
  const heading = {
    ...block(article),
    getBoundingClientRect: () => ({ top: 400 - scroll }),
  };
  const repository = {
    ...block(article),
    getBoundingClientRect: () => ({ top: 1064 + growth - scroll }),
  };
  const footer = {
    getBoundingClientRect: () => ({ top: 1500 + growth - scroll }),
  };
  const root = {
    querySelector: () => footer,
    querySelectorAll: (selector) => {
      assert.doesNotMatch(selector, /h3, h4, h5, h6, p/);
      return [section, article];
    },
  };
  const before = readLocaleLayout(root);
  growth = 300;
  scroll = 300;
  const after = readLocaleLayout(root);
  assert.equal(before.get(article), after.get(article));
  assert.equal(after.has(heading), false);
  assert.equal(after.has(repository), false);
  const animations = animateLocaleLayout(before, after);
  assert.deepEqual(
    animations.map((a) => a.keyframes[0].translate),
    [
      "0 300px", // whole section follows the footer anchoring
      "0 -300px", // panel boundary cancels that displacement
    ],
  );
});
