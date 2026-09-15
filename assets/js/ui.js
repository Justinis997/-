export const COMPACT_LAYOUT_QUERY = '(max-width: 640px)';

export function onReady(callback) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

export function normalizeIndex(index, length) {
  return ((index % length) + length) % length;
}

function trapFocus(event, dialog) {
  if (event.key !== 'Tab') return;

  const focusable = [...dialog.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )];
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable.at(-1);
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }
}

export function bindDialogInteractions({
  dialog,
  closeButton,
  previousButton,
  nextButton,
  close,
  previous,
  next,
  trapKeyboardFocus = false,
}) {
  if (!dialog) return;

  closeButton?.addEventListener('click', close);
  previousButton?.addEventListener('click', previous);
  nextButton?.addEventListener('click', next);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
  document.addEventListener('keydown', (event) => {
    if (!dialog.open) return;
    if (trapKeyboardFocus) trapFocus(event, dialog);

    if (event.key === 'Escape') {
      event.preventDefault?.();
      close();
    } else if (event.key === 'ArrowLeft') {
      previous?.();
    } else if (event.key === 'ArrowRight') {
      next?.();
    }
  });
}
