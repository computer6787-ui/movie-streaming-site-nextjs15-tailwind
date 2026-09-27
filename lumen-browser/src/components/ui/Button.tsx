"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "motion/react";
import { useTransitions } from "./Motion";

type Variant = "ghost" | "soft" | "solid" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[12px] gap-1.5 rounded-lg",
  md: "h-9 px-3 text-[13px] gap-2 rounded-[10px]",
  lg: "h-11 px-5 text-sm gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-[10px] justify-center",
  "icon-sm": "h-7 w-7 rounded-lg justify-center",
};

const VARIANTS: Record<Variant, string> = {
  ghost: "text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]",
  soft: "bg-[var(--bg-hover)] text-[var(--fg-primary)] hover:bg-[var(--bg-active)]",
  solid:
    "text-white accent-gradient shadow-[0_2px_10px_color-mix(in_oklab,var(--accent-from)_35%,transparent)] hover:brightness-108",
  outline:
    "border border-[var(--border-default)] text-[var(--fg-primary)] hover:bg-[var(--bg-hover)]",
  danger:
    "bg-red-500/12 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/25",
};

/**
 * The one button in the app. `whileTap` is a scale nudge — never a bounce — and
 * it collapses to nothing when animations are switched off.
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "ghost", size = "md", className = "", children, ...rest },
  ref,
) {
  const { fast, enabled } = useTransitions();

  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={enabled ? { scale: 0.96 } : undefined}
      whileHover={enabled ? { scale: 1.02 } : undefined}
      transition={fast}
      className={`inline-flex items-center font-medium select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
});
