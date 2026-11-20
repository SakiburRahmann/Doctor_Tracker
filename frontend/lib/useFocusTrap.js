'use client';

/**
 * Focus management for dialogs: move focus into the dialog on open, keep Tab
 * cycling inside it, optionally close on Escape, and return focus to whatever
 * was focused before it opened. Used by the shared Modal and the inline
 * confirm dialogs so every overlay behaves the same for keyboard users.
 */
import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function useFocusTrap(ref, active, onEscape) {
  // Keep the latest Escape handler without re-running the effect every render.
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!active || !ref.current) return undefined;
    const node = ref.current;
    const previous = document.activeElement;

    const focusables = () =>
      Array.from(node.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);

    // Respect an autoFocus'd field; otherwise focus the first control.
    if (!node.contains(document.activeElement)) {
      const first = focusables()[0];
      if (first) first.focus();
    }

    const onKey = (e) => {
      if (e.key === 'Escape' && escapeRef.current) {
        e.preventDefault();
        escapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = node.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [ref, active]);
}
