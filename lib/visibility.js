// lib/visibility.js — RAF gating.
// Pauses animation work when the tab is hidden or the element is
// offscreen. Effects call shouldRender() inside their RAF loop.

export function isDocumentVisible() {
  return document.visibilityState === 'visible';
}

// Observe a single element; returns a getter and a cleanup.
export function createVisibilityObserver(el, { rootMargin = '0px' } = {}) {
  let visible = true;
  const obs = new IntersectionObserver(
    entries => {
      for (const e of entries) visible = e.isIntersecting;
    },
    { rootMargin }
  );
  obs.observe(el);
  return {
    isVisible: () => visible,
    destroy: () => obs.disconnect(),
  };
}

// Combined check used by every effect's RAF loop.
export function shouldRender(el, observer) {
  if (!isDocumentVisible()) return false;
  if (observer && !observer.isVisible()) return false;
  return true;
}
