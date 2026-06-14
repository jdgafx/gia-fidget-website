// lib/visibility.js — Gating animation loops for performance

export function isDocumentVisible() {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

export function createVisibilityObserver(element) {
  let isIntersecting = true;
  
  if (typeof IntersectionObserver !== 'undefined' && element) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        isIntersecting = entry.isIntersecting;
      }
    }, { threshold: 0.05 });
    
    observer.observe(element);
    
    return {
      isVisible() {
        return isIntersecting && isDocumentVisible();
      },
      destroy() {
        observer.disconnect();
      }
    };
  }
  
  return {
    isVisible() {
      return isDocumentVisible();
    },
    destroy() {}
  };
}

export function shouldRender(element, observerInstance) {
  if (observerInstance) {
    return observerInstance.isVisible();
  }
  return isDocumentVisible();
}
