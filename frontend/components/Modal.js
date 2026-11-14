'use client';

/**
 * Accessible modal shell: overlay click + Esc to close, spring scale-in,
 * and a proper exit animation via AnimatePresence (opacity + y + scale).
 */
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from './icons';
import { springs } from './motion-kit';

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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-mist-900/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={springs.soft}
            className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-mist-200 bg-white p-6 shadow-overlay ${
              wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-mist-150 pb-4">
              <h2 className="text-base font-semibold text-mist-900">{title}</h2>
              <motion.button
                onClick={onClose}
                aria-label="Close dialog"
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.85 }}
                transition={springs.bouncy}
                className="icon-btn"
              >
                {Icon.close({ size: 16 })}
              </motion.button>
            </div>
            {children}
            {footer && <div className="mt-6 flex flex-col-reverse gap-2 border-t border-mist-150 pt-4 sm:flex-row sm:justify-end">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
