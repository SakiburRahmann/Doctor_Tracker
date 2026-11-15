'use client';

/**
 * Back control used by every inner page.
 *
 * `router.back()` alone is wrong for a deep link or a refreshed tab: there is no
 * history, so it leaves the app. When there is nothing to go back to we navigate
 * to the section's parent instead.
 */
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

export default function BackButton({ fallback = '/dashboard', label = 'Go back', className = '' }) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(fallback);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface/70 text-ink-2 transition-colors hover:bg-surface hover:text-ink ${className}`}
    >
      {Icon.arrowLeft({ size: 16 })}
    </button>
  );
}
