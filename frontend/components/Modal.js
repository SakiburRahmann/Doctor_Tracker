'use client';

/**
 * Accessible modal shell: overlay click + Esc to close, spring scale-in,
 * and an exit animation via AnimatePresence.
 */
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from './icons';
import { springs } from './motion-kit';
import useFocusTrap from '@/lib/useFocusTrap';

export default function Modal({ open, title, onClose, children, footer, wide = false }) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, open, onClose);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.99 }}
            transition={springs.soft}
            className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-pop ${
              wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
            }`}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close dialog" className="icon-btn -mr-1 -mt-1">
                {Icon.close({ size: 16 })}
              </button>
            </div>
            <div className="divider mb-5" />
            {children}
            {footer && (
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
