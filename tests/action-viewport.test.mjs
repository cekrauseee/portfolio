import assert from "node:assert/strict";
import test from "node:test";
import { accommodateAction } from "../src/lib/action-viewport.ts";
import { releaseCollapsedViewport } from "../src/lib/viewport-scroll.ts";

function viewport(
  t,
  {
    top = 600,
    reduced = false,
    initialHeight = 0,
    closing = false,
    scrollTop = 0,
    contentHeight = 400,
    switching = false,
  } = {},
) {
  const events = new EventTarget();
  let frame;
  let height = initialHeight;
  const scroller = {
    scrollTop,
    scrollHeight: 1400,
    clientHeight: 800,
    scrollTo({ top }) {
      this.scrollTop = top;
    },
    getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
  };
  const root = {
    isConnected: true,
    closest: () => scroller,
    getBoundingClientRect: () => ({ top: top - scroller.scrollTop }),
  };
  const panel = {
    firstElementChild: { firstElementChild: { offsetHeight: contentHeight } },
    getBoundingClientRect: () => ({
      top: top + 20 - scroller.scrollTop,
      height,
    }),
  };
  const globals = {
    window: Object.assign(events, { innerHeight: 800 }),
    getComputedStyle: () => ({ overflowY: "auto" }),
    matchMedia: () => ({ matches: reduced }),
    requestAnimationFrame: (callback) => {
      frame = callback;
      return 1;
    },
    cancelAnimationFrame: () => {
      frame = undefined;
    },
  };
  let cancel;
  t.after(() => cancel?.());
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else delete globalThis[key];
    });
  }
  cancel = closing
    ? releaseCollapsedViewport(root, panel)
    : accommodateAction(root, panel, switching);
  return {
    scroller,
    events,
    step(time, nextHeight) {
      height = nextHeight;
      const callback = frame;
      frame = undefined;
      callback?.(time);
    },
    shiftRoot(delta) {
      top += delta;
    },
    pending: () => Boolean(frame),
  };
}

test("accommodation follows panel geometry, including interrupted expansion", (t) => {
  const view = viewport(t, { initialHeight: 100 });
  view.step(0, 100);
  assert.equal(view.scroller.scrollTop, 0);
  view.step(100, 250);
  assert.equal(view.scroller.scrollTop, 205);
  view.step(500, 400);
  assert.equal(view.scroller.scrollTop, 410);
  assert.equal(view.pending(), false);
});

test("fully visible actions stay still", (t) => {
  const view = viewport(t, { top: 100 });
  assert.equal(view.pending(), false);
  assert.equal(view.scroller.scrollTop, 0);
});

test("reduced motion accommodates immediately", (t) => {
  const view = viewport(t, { reduced: true });
  view.step(0, 400);
  assert.equal(view.scroller.scrollTop, 410);
  assert.equal(view.pending(), false);
});

for (const event of [
  "wheel",
  "touchstart",
  "pointerdown",
  "keydown",
  "resize",
]) {
  test(`${event} cancels accommodation`, (t) => {
    const view = viewport(t);
    view.events.dispatchEvent(new Event(event));
    assert.equal(view.pending(), false);
    assert.equal(view.scroller.scrollTop, 0);
  });
}

test("external scroll takes priority", (t) => {
  const view = viewport(t);
  view.scroller.scrollTop = 50;
  view.step(0, 200);
  assert.equal(view.scroller.scrollTop, 50);
  assert.equal(view.pending(), false);
});

test("closing releases only scroll that will no longer fit", (t) => {
  const view = viewport(t, {
    closing: true,
    initialHeight: 400,
    scrollTop: 500,
  });
  view.step(0, 400);
  assert.equal(view.scroller.scrollTop, 500);
  view.step(100, 200);
  assert.equal(view.scroller.scrollTop, 350);
  view.step(500, 0);
  assert.equal(view.scroller.scrollTop, 200);
  assert.equal(view.pending(), false);
});

test("closing leaves valid scroll positions alone", (t) => {
  const view = viewport(t, {
    closing: true,
    initialHeight: 400,
    scrollTop: 100,
  });
  assert.equal(view.pending(), false);
  assert.equal(view.scroller.scrollTop, 100);
});

test("browser clamping at the page end does not cancel closing", (t) => {
  const view = viewport(t, {
    closing: true,
    initialHeight: 400,
    scrollTop: 600,
  });
  view.step(0, 400);
  view.scroller.scrollHeight = 1300;
  view.scroller.scrollTop = 500;
  view.step(100, 300);
  assert.equal(view.pending(), true);
  assert.equal(view.scroller.scrollTop, 500);
  view.scroller.scrollHeight = 1000;
  view.scroller.scrollTop = 200;
  view.step(500, 0);
  assert.equal(view.scroller.scrollTop, 200);
  assert.equal(view.pending(), false);
});

test("long project content brings its heading near the viewport top", (t) => {
  const view = viewport(t, { contentHeight: 1000 });
  view.step(0, 0);
  view.step(500, 1000);
  assert.equal(view.scroller.scrollTop, 576);
});

test("switching accounts for the previous sibling shrinking above the heading", (t) => {
  const view = viewport(t, { switching: true });
  view.step(0, 0);
  view.shiftRoot(-50);
  view.step(100, 200);
  assert.equal(view.scroller.scrollTop, 155);
  view.step(200, 400);
  assert.equal(view.pending(), true);
  view.shiftRoot(-50);
  view.step(500, 400);
  assert.equal(view.scroller.scrollTop, 310);
  assert.equal(view.pending(), false);
});

test("an already visible next item retains its heading during sibling collapse", (t) => {
  const view = viewport(t, { top: 600, scrollTop: 500, switching: true });
  view.step(0, 0);
  view.shiftRoot(-100);
  view.step(500, 400);
  assert.equal(view.scroller.scrollTop, 400);
});
