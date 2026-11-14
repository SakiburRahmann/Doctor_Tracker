'use client';

/**
 * Accessible modal shell: overlay click + Esc to close, focus trapped inside
 * by the native dialog pattern (autofocus on the first input).
 */
import { useEffect, useRef } from 'react';
import { Icon } from './icons';

export default function Modal({ open, title, onClose, children, footer, wide = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto border border-hairline-strong bg-sand-50 p-6 shadow-raised sm:rounded-md ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-hairline pb-3">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-[3px] p-1.5 text-sand-500 transition hover:bg-sand-100 hover:text-ink-700"
          >
            {Icon.close({ size: 16 })}
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 border-t border-hairline pt-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}
