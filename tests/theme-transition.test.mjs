import assert from "node:assert/strict";
import test from "node:test";
import { transitionTheme } from "../src/theme/theme-transition.ts";

function fixture(t) {
  let dark = false;
  let reduced = false;
  const animations = [];
  class Element {
    isConnected = true;
    constructor(parent) {
      this.parent = parent;
      this.inline = new Map([["transition-duration", ["420ms", "important"]]]);
      this.style = {
        getPropertyValue: (key) => this.inline.get(key)?.[0] ?? "",
        getPropertyPriority: (key) => this.inline.get(key)?.[1] ?? "",
        setProperty: (key, value, priority) =>
          this.inline.set(key, [value, priority]),
        removeProperty: (key) => this.inline.delete(key),
      };
      Object.defineProperty(this.style, "transition", {
        set: (value) => {
          for (const key of [
            "transition-property",
            "transition-duration",
            "transition-timing-function",
            "transition-delay",
            "transition-behavior",
          ]) {
            this.inline.set(key, [value, ""]);
          }
        },
      });
    }
    animate(frames, options) {
      // A new ancestor animation affects inherited computed color immediately.
      this.displayed = frames[0].color;
      const animation = {
        frames,
        options,
        element: this,
        cancel: () => {
          this.displayed = undefined;
          animation.cancelled = true;
        },
      };
      animations.push(animation);
      return animation;
    }
  }
  const root = new Element();
  const child = new Element(root);
  const elements = [root, child];
  function color(element) {
    return (
      element.displayed ??
      (element.parent
        ? color(element.parent)
        : dark
          ? "rgb(240, 240, 240)"
          : "rgb(20, 20, 20)")
    );
  }
  const globals = {
    HTMLElement: Element,
    SVGElement: class {},
    window: { matchMedia: () => ({ matches: reduced }) },
    document: {
      documentElement: root,
      querySelectorAll: () => elements,
      timeline: { currentTime: 1234 },
    },
    getComputedStyle: (element) => ({
      color: color(element),
      backgroundColor: dark ? "rgb(17, 17, 16)" : "rgb(243, 243, 241)",
      transitionProperty: "opacity",
      transition: "opacity 420ms ease-out",
    }),
  };
  // Cancel module-owned animations while this fixture's globals still exist.
  t.after(() => {
    reduced = true;
    transitionTheme(() => {});
  });
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    });
  }
  return {
    elements,
    animations,
    dark: () => {
      dark = true;
    },
    light: () => {
      dark = false;
    },
    reduce: () => {
      reduced = true;
    },
  };
}

test("inherited labels use the final palette and the same clock as their parent", (t) => {
  const f = fixture(t);
  transitionTheme(f.dark);
  assert.equal(f.animations.length, 2);
  for (const animation of f.animations) {
    assert.equal(animation.frames[0].color, "rgb(20, 20, 20)");
    assert.equal(animation.frames[1].color, "rgb(240, 240, 240)");
    assert.equal(animation.startTime, 1234);
    assert.deepEqual(animation.options, {
      duration: 200,
      easing: "ease-in-out",
    });
    assert.equal(
      animation.element.style.getPropertyValue("transition-duration"),
      "420ms",
    );
    assert.equal(
      animation.element.style.getPropertyPriority("transition-duration"),
      "important",
    );
  }
});

test("rapid reversals start at the currently displayed color", (t) => {
  const f = fixture(t);
  transitionTheme(f.dark);
  const previous = [...f.animations];
  f.elements.forEach((element) => {
    element.displayed = "rgb(100, 100, 100)";
  });
  transitionTheme(f.light);
  assert.ok(previous.every((animation) => animation.cancelled));
  for (const animation of f.animations.slice(2)) {
    assert.equal(animation.frames[0].color, "rgb(100, 100, 100)");
    assert.equal(animation.frames[1].color, "rgb(20, 20, 20)");
  }
});

test("reduced motion cancels the active transition and commits immediately", (t) => {
  const f = fixture(t);
  transitionTheme(f.dark);
  f.reduce();
  let applied = false;
  transitionTheme(() => {
    f.light();
    applied = true;
  });
  assert.equal(applied, true);
  assert.equal(f.animations.length, 2);
  assert.ok(f.animations.every((animation) => animation.cancelled));
});

test("unchanged palettes create no animation", (t) => {
  const f = fixture(t);
  transitionTheme(f.light);
  assert.equal(f.animations.length, 0);
});

test("temporary transition styles are restored if the update throws", (t) => {
  const f = fixture(t);
  assert.throws(
    () =>
      transitionTheme(() => {
        throw new Error("update failed");
      }),
    /update failed/,
  );
  for (const element of f.elements) {
    assert.deepEqual(
      [...element.inline],
      [["transition-duration", ["420ms", "important"]]],
    );
  }
});
