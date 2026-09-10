import assert from "node:assert/strict";
import test from "node:test";
import { createButtonLabelMotion } from "../src/lib/button-label-motion.ts";

function setup(t, reduced = false) {
  const preference = Object.assign(new EventTarget(), { matches: reduced });
  const windowEvents = Object.assign(new EventTarget(), {
    matchMedia: () => preference,
  });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowEvents,
  });
  const calls = [];
  let width = 100;
  let visible = true;
  function element() {
    return {
      textContent: "",
      getClientRects: () => (visible ? [{}] : []),
      getBoundingClientRect: () => ({ width }),
      animate(keyframes, options) {
        const animation = {
          keyframes,
          options,
          onfinish: null,
          canceled: false,
          cancel() {
            this.canceled = true;
          },
        };
        calls.push(animation);
        return animation;
      },
    };
  }
  const controller = createButtonLabelMotion(element(), element());
  t.after(() => {
    controller.dispose();
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  });
  return {
    controller,
    calls,
    preference,
    windowEvents,
    width(value) {
      width = value;
    },
    hide() {
      visible = false;
    },
  };
}

test("first render and same-state translations do not animate", (t) => {
  const view = setup(t);
  view.controller.update("post message", false);
  view.controller.update("publicar mensagem", false);
  assert.equal(view.calls.length, 0);
});

test("state changes animate only the current label and interpolate width", (t) => {
  const view = setup(t);
  view.controller.update("post message");
  view.width(70);
  view.controller.update("sending…");
  assert.equal(view.calls.length, 2);
  assert.deepEqual(view.calls[1].keyframes, [
    { width: "100px" },
    { width: "70px" },
  ]);
  assert.equal(view.calls[0].keyframes[0].width, "70px");
  assert.equal(view.calls[0].options.fill, "forwards");
  view.calls[1].onfinish();
  assert.ok(view.calls.every((animation) => animation.canceled));
});

test("rapid reversal starts at the currently displayed width and cancels stale completion", (t) => {
  const view = setup(t);
  view.controller.update("post message");
  view.width(70);
  view.controller.update("sending…");
  view.width(85);
  view.controller.update("post message");
  assert.equal(view.calls[3].keyframes[0].width, "85px");
  assert.equal(view.calls[1].onfinish, null);
  assert.ok(view.calls.slice(0, 2).every((animation) => animation.canceled));
});

test("reduced motion commits immediately", (t) => {
  const view = setup(t, true);
  view.controller.update("post message");
  view.controller.update("sending…");
  assert.equal(view.calls.length, 0);
});

for (const event of ["resize", "change"]) {
  test(`${event} settles an active transition`, (t) => {
    const view = setup(t);
    view.controller.update("post message");
    view.controller.update("sending…");
    (event === "resize" ? view.windowEvents : view.preference).dispatchEvent(
      new Event(event),
    );
    assert.ok(view.calls.every((animation) => animation.canceled));
  });
}

test("hidden content skips motion and disposal cancels active work", (t) => {
  const view = setup(t);
  view.controller.update("post message");
  view.controller.update("sending…");
  view.controller.dispose();
  assert.ok(view.calls.every((animation) => animation.canceled));
  view.hide();
  view.controller.update("post message");
  assert.equal(view.calls.length, 2);
});
