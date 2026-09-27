"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { useTransitions } from "./Motion";

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: Props) {
  const id = useId();
  const { fast, enabled } = useTransitions();

  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[13px] font-medium text-[var(--fg-primary)]">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{description}</span>
        )}
      </label>

      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
          checked ? "accent-gradient" : "bg-[var(--bg-active)]"
        }`}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 16 : 0 }}
          transition={enabled ? fast : { duration: 0 }}
          layout={false}
        />
      </button>
    </div>
  );
}
