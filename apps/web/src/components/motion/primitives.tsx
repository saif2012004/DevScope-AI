"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode, ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * FadeIn — enters with a subtle upward fade as it scrolls into view.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 16,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger — animates direct children in sequence. Wrap items in <StaggerItem>.
 */
export function Stagger({
  children,
  className,
  delay = 0,
  stagger = 0.08,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  once?: boolean;
}) {
  const variants: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 18,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  };
  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * AnimatedCard — surface with subtle tilt-on-hover and entrance.
 */
export function AnimatedCard({
  children,
  className,
  hover = true,
  ...rest
}: { hover?: boolean } & ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      whileHover={hover ? { y: -3 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Gradient text — animated brand gradient for headlines.
 */
export function GradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("text-gradient-brand", className)}>{children}</span>;
}

/**
 * AnimatedGridBg — animated grid + radial spotlight backdrop for sections.
 */
export function AnimatedGridBg({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-hero-radial" />
      <motion.div
        className="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[hsl(263_85%_60%/0.18)] blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.85, 0.6] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/**
 * AuroraBg — animated multi-color aurora for premium sections.
 */
export function AuroraBg({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-aurora opacity-70" />
      <motion.div
        className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-[hsl(263_85%_60%/0.45)] blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[hsl(199_89%_60%/0.35)] blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/**
 * ShimmerButton — Cursor / v0-style CTA with a moving conic shimmer border.
 */
export function ShimmerButton({
  children,
  className,
  ...rest
}: ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "shimmer-border relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full",
        "bg-gradient-to-b from-[hsl(263_85%_65%)] to-[hsl(263_85%_50%)]",
        "px-6 py-3 text-sm font-medium text-white shadow-[0_10px_40px_-10px_hsl(263_85%_60%/0.7)]",
        "transition-colors hover:from-[hsl(263_85%_70%)] hover:to-[hsl(263_85%_55%)]",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/**
 * GhostGlowButton — secondary CTA with subtle glow.
 */
export function GhostGlowButton({
  children,
  className,
  ...rest
}: ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, borderColor: "hsl(263 85% 65% / 0.5)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04]",
        "px-6 py-3 text-sm font-medium text-white backdrop-blur transition-colors",
        "hover:bg-white/[0.08]",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
