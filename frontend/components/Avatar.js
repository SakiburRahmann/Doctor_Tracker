'use client';

import { useState } from 'react';
import { initials } from '@/lib/utils';
import { portraitUrl } from '@/lib/portraits';

/**
 * A person's portrait.
 *
 * The initials are painted first and the photograph sits on top, so a slow or
 * blocked CDN degrades to a readable monogram instead of an empty circle.
 */
export default function Avatar({ id, name = '', kind = 'doctor', size = 32, radius, className = '' }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const corner = radius ?? (size >= 56 ? 12 : 999);

  return (
    <span
      className={`avatar relative bg-surface-3 text-ink-2 ${className}`}
      style={{ width: size, height: size, borderRadius: corner }}
    >
      <span style={{ fontSize: Math.max(9, Math.round(size * 0.32)) }} aria-hidden>
        {initials(name)}
      </span>
      {!failed && (
        <img
          src={portraitUrl(id || name, kind, size)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </span>
  );
}
