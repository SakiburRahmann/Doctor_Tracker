'use client';

/**
 * Theme switch used in the top bar and on the login screen.
 * Sun/moon is rendered from the current theme, with a spring on press.
 */
import { motion } from 'motion/react';
import { useTheme } from '@/lib/theme-context';
import { Icon } from './icons';
import { springs } from './motion-kit';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggle } = useTheme();

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.9 }}
      transition={springs.snappy}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
      className={`grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-2 transition-colors duration-150 hover:border-line-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${className}`}
    >
      <motion.span
        key={isDark ? 'moon' : 'sun'}
        initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={springs.bouncy}
        className="grid place-items-center"
      >
        {isDark ? Icon.moon({ size: 16 }) : Icon.sun({ size: 16 })}
      </motion.span>
    </motion.button>
  );
}
