'use client';

/**
 * Motion primitives: shared spring configs, entrance variants, and
 * the mouse-tracked SpotlightCard used across the app.
 * Springs for transforms (physics), tweens for opacity/color (Motion defaults).
 */
import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

/* Spring vocabulary — one set of curves so everything moves the same way. */
export const springs = {
  /** Snappy: nav pills, toggles, small chips. */
  snappy: { type: 'spring', stiffness: 500, damping: 32, mass: 0.9 },
  /** Default: cards, hovers, drawer. */
  soft: { type: 'spring', stiffness: 260, damping: 26 },
  /** Bouncy: buttons, playful feedback. */
  bouncy: { type: 'spring', stiffness: 420, damping: 18 },
  /** Layout morphs (active pill, modal resize). */
  layout: { type: 'spring', stiffness: 380, damping: 32 },
};

/* Entrance choreography: children rise + fade with a stagger. */
export const stagger = (delay = 0.05, initial = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: initial } },
});

export const riseChild = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: springs.soft },
};

/**
 * Mouse-tracked spotlight card (Aceternity-style): a radial gradient that
 * follows the cursor inside the card surface. Pure CSS vars + springs, no JS re-render.
 */
export function SpotlightCard({ children, className = '', spotlightColor = 'rgba(46, 155, 148, 0.14)', ...rest }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 220, damping: 24 });
  const sy = useSpring(my, { stiffness: 220, damping: 24 });
  const background = useTransform([sx, sy], ([x, y]) => `radial-gradient(420px circle at ${x}px ${y}px, ${spotlightColor}, transparent 65%)`);

  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        mx.set(e.clientX - rect.left);
        my.set(e.clientY - rect.top);
      }}
      className={className}
      {...rest}
    >
      <motion.div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background }} />
      {children}
    </motion.div>
  );
}

/** 3D tilt for hero elements (subtle, 6deg max). */
export function TiltCard({ children, className = '', max = 6, ...rest }) {
  const ref = useRef(null);
  const rx = useSpring(0, springs.soft);
  const ry = useSpring(0, springs.soft);
  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        ry.set(px * max);
        rx.set(-py * max);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
