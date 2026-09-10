import assert from "node:assert/strict";
import test from "node:test";
import {
  accommodateReadyContent,
  createStreamingScrollFollower,
  releaseCollapsedViewport,
} from "../src/lib/viewport-scroll.ts";

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
    pending = false,
    collapsingHeightBefore = 0,
  } = {},
) {
  const events = new EventTarget();
  let frame;
  let notifyReady;
  let observing = false;
  let height = initialHeight;
  let panelOffset = collapsingHeightBefore;
  const scroller = Object.assign(new EventTarget(), {
    scrollTop,
    scrollHeight: 1400,
    clientHeight: 800,
    scrollTo({ top }) {
      this.scrollTop = top;
    },
    getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
  });
  const root = {
    isConnected: true,
    closest: () => scroller,
    getBoundingClientRect: () => ({ top: top - scroller.scrollTop }),
  };
  const panel = {
    querySelector: () => pending,
    previousElementSibling: collapsingHeightBefore
      ? {
          previousElementSibling: null,
          getAttribute: (name) => (name === "aria-hidden" ? "true" : null),
          getBoundingClientRect: () => ({ height: collapsingHeightBefore }),
        }
      : null,
    firstElementChild: { firstElementChild: { offsetHeight: contentHeight } },
    getBoundingClientRect: () => ({
      top: top + 20 + panelOffset - scroller.scrollTop,
      height,
    }),
  };
  const globals = {
    MutationObserver: class {
      constructor(callback) {
        notifyReady = callback;
      }
      observe() {
        observing = true;
      }
      disconnect() {
        observing = false;
      }
    },
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
    : accommodateReadyContent(root, panel, switching);
  return {
    scroller,
    events,
    step(time, nextHeight) {
      height = nextHeight;
      const callback = frame;
      frame = undefined;
      callback?.(time);
    },
    ready() {
      pending = false;
      if (observing) notifyReady();
    },
    shiftRoot(delta) {
      top += delta;
    },
    shiftPanel(delta) {
      panelOffset += delta;
    },
    pending: () => Boolean(frame),
  };
}

function streamingViewport(t, { edgeBottom = 850 } = {}) {
  const events = new EventTarget();
  const scroller = Object.assign(new EventTarget(), {
    scrollTop: 0,
    scrollHeight: 1600,
    clientHeight: 800,
    scrollTo({ top }) {
      this.scrollTop = top;
    },
    getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
  });
  const root = {
    isConnected: true,
    closest: () => scroller,
  };
  const edge = {
    isConnected: true,
    getBoundingClientRect: () => ({
      bottom: edgeBottom - scroller.scrollTop,
    }),
  };
  const globals = {
    window: Object.assign(events, { innerHeight: 800 }),
    getComputedStyle: () => ({ overflowY: "auto" }),
  };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else delete globalThis[key];
    });
  }

  const follower = createStreamingScrollFollower(root);
  t.after(follower.cancel);
  return {
    edge,
    events,
    follower,
    scroller,
    grow(amount) {
      edgeBottom += amount;
    },
  };
}

test("accommodation follows panel geometry, including interrupted expansion", (t) => {
  const view = viewport(t, { initialHeight: 100 });
  view.step(0, 100);
  assert.equal(view.scroller.scrollTop, 0);
  view.step(100, 250);
  assert.equal(view.scroller.scrollTop, 205);
  view.step(400, 400);
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
  view.step(400, 0);
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
  view.step(400, 0);
  assert.equal(view.scroller.scrollTop, 200);
  assert.equal(view.pending(), false);
});

test("long project content brings its heading near the viewport top", (t) => {
  const view = viewport(t, { contentHeight: 1000 });
  view.step(0, 0);
  view.step(400, 1000);
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
  view.step(400, 400);
  assert.equal(view.scroller.scrollTop, 310);
  assert.equal(view.pending(), false);
});

test("an already visible next item retains its heading during sibling collapse", (t) => {
  const view = viewport(t, { top: 600, scrollTop: 500, switching: true });
  view.step(0, 0);
  view.shiftRoot(-100);
  view.step(400, 400);
  assert.equal(view.scroller.scrollTop, 400);
});

test("switching actions measures after an earlier panel collapses", (t) => {
  const view = viewport(t, { switching: true, collapsingHeightBefore: 400 });
  view.step(0, 0);
  view.shiftPanel(-400);
  view.step(400, 400);
  assert.equal(view.scroller.scrollTop, 410);
});

test("streaming follows only the growing edge below the viewport", (t) => {
  const view = streamingViewport(t);
  view.follower.follow(view.edge);
  assert.equal(view.scroller.scrollTop, 74);

  view.grow(100);
  view.follower.follow(view.edge);
  assert.equal(view.scroller.scrollTop, 174);

  view.follower.follow(view.edge);
  assert.equal(view.scroller.scrollTop, 174);
});

for (const event of [
  "wheel",
  "touchstart",
  "pointerdown",
  "keydown",
  "resize",
]) {
  test(`${event} gives the visitor control during streaming`, (t) => {
    const view = streamingViewport(t);
    view.events.dispatchEvent(new Event(event));
    view.follower.follow(view.edge);
    assert.equal(view.scroller.scrollTop, 0);
  });
}

test("external scroll cancels streaming follow", (t) => {
  const view = streamingViewport(t);
  view.scroller.scrollTop = 40;
  view.scroller.dispatchEvent(new Event("scroll"));
  view.follower.follow(view.edge);
  assert.equal(view.scroller.scrollTop, 40);
});

test("first async opening measures loaded content even after a slow response", (t) => {
  const view = viewport(t, { pending: true, contentHeight: 1000 });
  view.step(1000, 100);
  assert.equal(view.scroller.scrollTop, 0);
  view.ready();
  view.step(1100, 1000);
  view.step(1500, 1000);
  assert.equal(view.scroller.scrollTop, 576);
});
for (const event of [
  "wheel",
  "touchstart",
  "pointerdown",
  "keydown",
  "resize",
]) {
  test(`${event} prevents delayed content from recentering`, (t) => {
    const view = viewport(t, { pending: true, contentHeight: 1000 });
    view.events.dispatchEvent(new Event(event));
    view.ready();
    view.step(1000, 1000);
    assert.equal(view.scroller.scrollTop, 0);
    assert.equal(view.pending(), false);
  });
}
test("external scroll cancels pending first-load accommodation", (t) => {
  const view = viewport(t, { pending: true });
  view.scroller.scrollTop = 80;
  view.scroller.dispatchEvent(new Event("scroll"));
  view.ready();
  view.step(1000, 400);
  assert.equal(view.scroller.scrollTop, 80);
});
