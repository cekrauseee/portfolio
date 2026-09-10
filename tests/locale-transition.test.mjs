import assert from "node:assert/strict";
import test from "node:test";
import {
  animateChangedText,
  requestLocaleTransition,
  getLocaleTransition,
  finishLocaleTransition,
  playLocaleTransition,
  readTextElements,
} from "../src/i18n/locale-transition.ts";

function element(tag, parentElement = null, textContent = "", opacity = "1") {
  return {
    tag,
    parentElement,
    textContent,
    opacity,
    dataset: {},
    getBoundingClientRect: () => ({ top: 0 }),
    querySelector: () => null,
    querySelectorAll: () => [],
    matches(selector) {
      return selector === this.tag;
    },
    closest(selector) {
      const tags = selector.split(",").map((value) => value.trim());
      if (tags.includes(this.tag)) {
        return this;
      }
      return this.parentElement?.closest(selector) ?? null;
    },
    animate(keyframes, options) {
      const animation = { keyframes, options };
      Object.defineProperty(animation, "startTime", {
        set() {
          assert.fail("A stale frame time must not override the native start");
        },
      });
      return animation;
    },
  };
}

test("project text inside buttons is included, preference controls stay still", (t) => {
  const root = element("div");
  const button = element("button", root, "Project");
  const description = element("span", button, "Descrição do projeto");
  const meta = element("span", description, "Período");
  const preference = element(
    "span",
    element("button", element("fieldset", root)),
    "português",
  );
  const nodes = [button, description, meta, preference].map(
    (parentElement) => ({
      parentElement,
      textContent: parentElement.textContent,
    }),
  );
  let index = -1;
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const originalFilter = Object.getOwnPropertyDescriptor(
    globalThis,
    "NodeFilter",
  );
  Object.defineProperty(globalThis, "NodeFilter", {
    configurable: true,
    value: { SHOW_TEXT: 4 },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createTreeWalker: () => ({
        nextNode: () => nodes[++index],
        get currentNode() {
          return nodes[index];
        },
      }),
    },
  });
  t.after(() => {
    if (originalDocument)
      Object.defineProperty(globalThis, "document", originalDocument);
    else delete globalThis.document;
    if (originalFilter)
      Object.defineProperty(globalThis, "NodeFilter", originalFilter);
    else delete globalThis.NodeFilter;
  });
  assert.deepEqual([...readTextElements(root).keys()], [description, meta]);
});

test("translated text starts on the native clock, once per nested branch", (t) => {
  const original = Object.getOwnPropertyDescriptor(
    globalThis,
    "getComputedStyle",
  );
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    value: (node) => ({ opacity: node.opacity }),
  });
  t.after(() => {
    if (original)
      Object.defineProperty(globalThis, "getComputedStyle", original);
    else delete globalThis.getComputedStyle;
  });
  const root = element("div");
  const description = element("span", element("button", root), "", "0.5");
  const nested = element("span", description);
  const unchanged = element("p", root);
  const before = new Map([
    [description, "role"],
    [nested, "period"],
    [unchanged, "Henrique"],
  ]);
  const after = new Map([
    [description, "cargo"],
    [nested, "período"],
    [unchanged, "Henrique"],
  ]);
  const animations = animateChangedText(root, before, after);
  assert.equal(animations.length, 1);
  assert.deepEqual(animations[0].keyframes, [
    { opacity: 0.325 },
    { opacity: 0.5 },
  ]);
  assert.deepEqual(animations[0].options, {
    duration: 150,
    easing: "ease-out",
  });
  assert.deepEqual(animateChangedText(root, after, after), []);
});

function lifecycleFixture(t) {
  const root = element("div");
  root.animate = () => {};
  const text = element("p", root, "hello");
  const frames = new Map();
  const animations = [];
  let frameId = 0;
  text.animate = (keyframes, options) => {
    let resolve;
    let reject;
    const finished = new Promise((yes, no) => {
      resolve = yes;
      reject = no;
    });
    const animation = {
      keyframes,
      options,
      finished,
      pause() {
        this.paused = true;
      },
      play() {
        this.played = true;
      },
      cancel() {
        reject(new Error("cancelled"));
      },
      finish() {
        resolve();
      },
    };
    animations.push(animation);
    return animation;
  };
  const globals = {
    window: { matchMedia: () => ({ matches: false }) },
    NodeFilter: { SHOW_TEXT: 4 },
    getComputedStyle: () => ({ opacity: "1" }),
    requestAnimationFrame: (callback) => {
      frames.set(++frameId, callback);
      return frameId;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    document: {
      createTreeWalker: () => {
        let visited = false;
        return {
          nextNode: () => {
            if (visited) return false;
            visited = true;
            return true;
          },
          currentNode: { parentElement: text, textContent: text.textContent },
        };
      },
    },
  };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    });
  }
  return {
    root,
    text,
    animations,
    frame() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback());
    },
  };
}

test("request survives the old locale and streaming before translated children arrive", async (t) => {
  const f = lifecycleFixture(t);
  assert.equal(playLocaleTransition(f.root, "en"), undefined);
  const request = requestLocaleTransition(f.root, "pt");
  t.after(() => finishLocaleTransition(request));
  assert.equal(playLocaleTransition(f.root, "en"), undefined);
  assert.equal(playLocaleTransition(f.root, "pt"), undefined);
  assert.equal(getLocaleTransition("pt"), request);
  f.text.textContent = "olá";
  playLocaleTransition(f.root, "pt");
  assert.equal(f.animations.length, 1);
  assert.equal(f.animations[0].paused, true);
  assert.equal(f.animations[0].currentTime, 0);
  assert.equal(f.animations[0].played, undefined);
  f.frame();
  assert.equal(f.animations[0].played, true);
  f.animations[0].finish();
  await new Promise(setImmediate);
  assert.equal(getLocaleTransition("pt"), undefined);
});

test("effect cancellation does not consume the request; a replay animates again", async (t) => {
  const f = lifecycleFixture(t);
  const request = requestLocaleTransition(f.root, "pt");
  t.after(() => finishLocaleTransition(request));
  f.text.textContent = "olá";
  const cleanup = playLocaleTransition(f.root, "pt");
  cleanup();
  await new Promise(setImmediate);
  assert.equal(getLocaleTransition("pt"), request);
  playLocaleTransition(f.root, "pt");
  f.frame();
  assert.equal(f.animations.length, 2);
  f.animations[1].finish();
  await new Promise(setImmediate);
  assert.equal(getLocaleTransition("pt"), undefined);
});

test("finishing an older request does not clear a newer language selection", (t) => {
  const f = lifecycleFixture(t);
  const first = requestLocaleTransition(f.root, "pt");
  const second = requestLocaleTransition(f.root, "ja");
  t.after(() => finishLocaleTransition(second));
  finishLocaleTransition(first);
  assert.equal(getLocaleTransition("ja"), second);
});

test("layout and text play together and release clipping after the longer movement", async (t) => {
  const f = lifecycleFixture(t);
  let top = 20;
  f.root.querySelectorAll = () => [f.text];
  f.text.getBoundingClientRect = () => ({ top });
  const request = requestLocaleTransition(f.root, "pt");
  t.after(() => finishLocaleTransition(request));
  f.text.textContent = "olá";
  top = 60;
  playLocaleTransition(f.root, "pt");
  assert.equal(f.animations.length, 2);
  assert.equal(f.root.dataset.localeLayout, "true");
  assert.equal(f.animations[0].options.duration, 150);
  assert.equal(f.animations[1].options.duration, 180);
  f.frame();
  assert.ok(f.animations.every((animation) => animation.played));
  f.animations[0].finish();
  await new Promise(setImmediate);
  assert.equal(getLocaleTransition("pt"), request);
  f.animations[1].finish();
  await new Promise(setImmediate);
  assert.equal(getLocaleTransition("pt"), undefined);
  assert.equal(f.root.dataset.localeLayout, undefined);
});

test("reduced motion skips both text and layout effects", (t) => {
  const f = lifecycleFixture(t);
  let top = 20;
  f.root.querySelectorAll = () => [f.text];
  f.text.getBoundingClientRect = () => ({ top });
  const request = requestLocaleTransition(f.root, "pt");
  t.after(() => finishLocaleTransition(request));
  top = 80;
  f.text.textContent = "olá";
  window.matchMedia = () => ({ matches: true });
  assert.equal(playLocaleTransition(f.root, "pt"), undefined);
  assert.deepEqual(f.animations, []);
  assert.equal(getLocaleTransition("pt"), undefined);
  assert.equal(f.root.dataset.localeLayout, undefined);
});

test("expanded translations reveal existing and inserted copy once in final geometry", (t) => {
  const f = lifecycleFixture(t);
  const selector = "article:has(> h3 > button[aria-expanded=true])";
  const article = element(selector, f.root);
  article.getBoundingClientRect = () => ({ height: 600 });
  const paragraph = element("p", article);
  const emphasis = element("strong", paragraph);
  const inserted = element("p", article);
  const before = new Map([[paragraph, "short copy"]]);
  const after = new Map([
    [paragraph, "a longer translation"],
    [emphasis, "translation"],
    [inserted, "an additional paragraph"],
  ]);

  for (const [oldHeight, inset] of [
    [300, 300],
    [800, 0],
  ]) {
    const animations = animateChangedText(
      f.root,
      before,
      after,
      new Map([[article, oldHeight]]),
    );
    assert.equal(animations.length, 1);
    assert.deepEqual(animations[0].keyframes, [
      { opacity: 0, clipPath: `inset(${inset}px 0 0)`, offset: 0 },
      { opacity: 0, offset: 0.2 },
      { opacity: 1, clipPath: "inset(0px 0 0)", offset: 1 },
    ]);
    assert.equal(animations[0].options.duration, 180);
  }
  assert.deepEqual(animateChangedText(f.root, after, after), []);
});

test("expanded reveal leaves room for a preceding summary that gains lines", (t) => {
  const f = lifecycleFixture(t);
  const original = Object.getOwnPropertyDescriptor(globalThis, "HTMLElement");
  class HtmlElement {}
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: HtmlElement,
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "HTMLElement", original);
    else delete globalThis.HTMLElement;
  });
  const article = element(
    "article:has(> h3 > button[aria-expanded=true])",
    f.root,
  );
  const sibling = new HtmlElement();
  sibling.getBoundingClientRect = () => ({ height: 100 });
  article.previousElementSibling = sibling;
  article.getBoundingClientRect = () => ({ height: 600 });
  const paragraph = element("p", article);
  const animations = animateChangedText(
    f.root,
    new Map([[paragraph, "old"]]),
    new Map([[paragraph, "new"]]),
    new Map([
      [article, 300],
      [sibling, 75],
    ]),
  );
  assert.equal(animations[0].keyframes[0].clipPath, "inset(325px 0 0)");
});
