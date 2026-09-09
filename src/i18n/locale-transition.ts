import type { Locale } from "@/i18n/config";
import {
  animateLocaleLayout,
  expandedArticle,
  readLocaleLayout,
} from "@/i18n/locale-layout";

type LocaleTransitionRequest = {
  locale: Locale;
  text: Map<HTMLElement, string>;
  layout: Map<HTMLElement, number>;
  articleHeights: Map<HTMLElement, number>;
};

let pendingRequest: LocaleTransitionRequest | undefined;

export function requestLocaleTransition(root: HTMLElement, locale: Locale) {
  pendingRequest = {
    locale,
    text: readTextElements(root),
    layout: readLocaleLayout(root),
    articleHeights: new Map(
      [...root.querySelectorAll<HTMLElement>("article")].map((element) => [
        element,
        element.getBoundingClientRect().height,
      ]),
    ),
  };
  return pendingRequest;
}

export function getLocaleTransition(locale: Locale) {
  return pendingRequest?.locale === locale ? pendingRequest : undefined;
}

export function finishLocaleTransition(request: LocaleTransitionRequest) {
  if (pendingRequest === request) {
    pendingRequest = undefined;
  }
}

export function readTextElements(root: HTMLElement) {
  const elements = new Map<HTMLElement, string>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const element = node.parentElement;
    if (
      !node.textContent?.trim() ||
      !element ||
      element === root ||
      element.matches("button") ||
      element.closest(
        'fieldset, input, textarea, select, script, style, svg, [aria-hidden="true"]',
      )
    ) {
      continue;
    }
    elements.set(element, element.textContent ?? "");
  }
  return elements;
}

export function animateChangedText(
  root: HTMLElement,
  previous: Map<HTMLElement, string>,
  currentText: Map<HTMLElement, string>,
  articleHeights = new Map<HTMLElement, number>(),
) {
  const candidates = new Set(
    [...currentText]
      .filter(([element, text]) => previous.get(element) !== text)
      .map(
        ([element]) => element.closest<HTMLElement>(expandedArticle) ?? element,
      ),
  );
  // Animate each text branch once so nested emphasis does not multiply opacity.
  const targets = [...candidates]
    .filter((element) => {
      for (
        let parent = element.parentElement;
        parent && parent !== root;
        parent = parent.parentElement
      ) {
        if (candidates.has(parent)) {
          return false;
        }
      }
      return true;
    })
    .map((element) => {
      const expanded = element.matches(expandedArticle);
      let growth = 0;
      if (expanded) {
        const height = element.getBoundingClientRect().height;
        growth = Math.max(0, height - (articleHeights.get(element) ?? height));
        // The preceding summary can also gain lines immediately. Keep the
        // reveal below that summary until its own FLIP has settled.
        const sibling = element.previousElementSibling;
        if (
          sibling &&
          sibling instanceof HTMLElement &&
          articleHeights.has(sibling)
        ) {
          growth += Math.max(
            0,
            sibling.getBoundingClientRect().height -
              articleHeights.get(sibling)!,
          );
        }
      }
      return {
        element,
        opacity: Number(getComputedStyle(element).opacity),
        expanded,
        growth,
      };
    });

  // Let the browser resolve a shared start on its next animation frame.
  // Assigning the previous frame's timeline time can spend the short effect
  // before the newly translated content has even painted.
  return targets.map(({ element, opacity, expanded, growth }) => {
    // Long translations reflow as one editorial block. Keep the initial
    // geometry replacement out of view, then reveal the whole article while
    // the surrounding sections finish moving. No per-paragraph overlap or
    // stagger, including blocks newly introduced by the translation.
    const animation = element.animate(
      expanded
        ? [
            { opacity: 0, clipPath: `inset(${growth}px 0 0)`, offset: 0 },
            { opacity: 0, offset: 0.2 },
            { opacity, clipPath: "inset(0px 0 0)", offset: 1 },
          ]
        : [{ opacity: opacity * 0.65 }, { opacity }],
      { duration: expanded ? 220 : 180, easing: "ease-out" },
    );
    return animation;
  });
}

export function playLocaleTransition(root: HTMLElement, locale: Locale) {
  const request = getLocaleTransition(locale);
  if (!request) {
    return;
  }
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    typeof root.animate !== "function"
  ) {
    finishLocaleTransition(request);
    return;
  }

  // Read final geometry before installing any animation effects.
  const layout = readLocaleLayout(root);
  const textAnimations = animateChangedText(
    root,
    request.text,
    readTextElements(root),
    request.articleHeights,
  );
  const layoutAnimations = animateLocaleLayout(request.layout, layout);
  const animations = [...textAnimations, ...layoutAnimations];
  if (!animations.length) {
    // The locale prop can arrive before streamed server children. Keep the
    // request until the translated text is actually committed.
    return;
  }

  // The shorter final layout must not clip blocks moving from their old position.
  if (layoutAnimations.length) {
    root.dataset.localeLayout = "true";
  }
  let disposed = false;
  const releaseLayout = () => {
    if (layoutAnimations.length) {
      delete root.dataset.localeLayout;
    }
  };

  // Hold the first keyframe until the next frame instead of spending the
  // short effect during the server response's React commit.
  animations.forEach((animation) => {
    animation.pause();
    animation.currentTime = 0;
  });
  void Promise.all(animations.map((animation) => animation.finished)).then(
    () => {
      if (!disposed) {
        releaseLayout();
        finishLocaleTransition(request);
      }
    },
    () => {
      // Suspense/effect cleanup cancelled this attempt. Retain the request
      // so the next committed render can replay it rather than skip it.
    },
  );
  const frame = requestAnimationFrame(() => {
    animations.forEach((animation) => animation.play());
  });
  return () => {
    disposed = true;
    releaseLayout();
    cancelAnimationFrame(frame);
    animations.forEach((animation) => animation.cancel());
  };
}
