"use client";

import type { ReactNode } from "react";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import { SEARCH_ENGINE_LIST, getEngine } from "@/lib/search/engines";
import type {
  AccentId,
  AnimationIntensity,
  Density,
  SearchEngineId,
  ThemeMode,
} from "@/types/browser";
import { Switch } from "@/components/ui/Switch";
import { PanelShell } from "./PanelShell";

/** Appearance, search, browser and experiment preferences. */

const THEMES: Array<{ id: ThemeMode; label: string }> = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

const ACCENTS: Array<{ id: AccentId; label: string; from: string; to: string }> = [
  { id: "lumen", label: "Lumen", from: "#4f46e5", to: "#7c3aed" },
  { id: "violet", label: "Violet", from: "#7c3aed", to: "#c026d3" },
  { id: "emerald", label: "Emerald", from: "#059669", to: "#0d9488" },
  { id: "amber", label: "Amber", from: "#d97706", to: "#ea580c" },
  { id: "rose", label: "Rose", from: "#e11d48", to: "#db2777" },
  { id: "sky", label: "Sky", from: "#0284c7", to: "#0ea5e9" },
];

const DENSITIES: Array<{ id: Density; label: string }> = [
  { id: "comfortable", label: "Comfortable" },
  { id: "compact", label: "Compact" },
];

const ANIMATIONS: Array<{ id: AnimationIntensity; label: string; hint: string }> = [
  { id: "full", label: "Full", hint: "Springs and slides" },
  { id: "reduced", label: "Reduced", hint: "Shorter, snappier" },
  { id: "off", label: "Off", hint: "No movement" },
];

const STARTUPS: Array<{ id: "restore-tabs" | "new-tab" | "homepage"; label: string }> = [
  { id: "restore-tabs", label: "Restore tabs" },
  { id: "new-tab", label: "New tab" },
  { id: "homepage", label: "Homepage" },
];

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useBrowserStore((s) => s.settings);
  const update = useBrowserStore((s) => s.updateSettings);

  return (
    <PanelShell open={open} onClose={onClose} title="Settings" subtitle="Saved on this device">
      <div className="space-y-7">
        <Group title="Appearance">
          <Label>Theme</Label>
          <Segmented
            options={THEMES}
            value={settings.theme}
            onChange={(v) => update({ theme: v as ThemeMode })}
          />

          <Label>Accent</Label>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => update({ accent: a.id })}
                aria-label={a.label}
                aria-pressed={settings.accent === a.id}
                title={a.label}
                className="h-7 w-7 rounded-lg transition-transform hover:scale-110"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${a.from}, ${a.to})`,
                  boxShadow:
                    settings.accent === a.id
                      ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${a.from}`
                      : undefined,
                }}
              />
            ))}
          </div>

          <Label>Density</Label>
          <Segmented
            options={DENSITIES}
            value={settings.density}
            onChange={(v) => update({ density: v as Density })}
          />

          <Label>Animation</Label>
          <Segmented
            options={ANIMATIONS}
            value={settings.animation}
            onChange={(v) => update({ animation: v as AnimationIntensity })}
            hint={ANIMATIONS.find((a) => a.id === settings.animation)?.hint}
          />

          <Switch
            checked={settings.reduceTransparency}
            onChange={(v) => update({ reduceTransparency: v })}
            label="Reduce transparency"
            description="Replaces blurred, translucent surfaces with solid colours."
          />
        </Group>
        <Group title="Search">
          <Label>Default engine</Label>
          <select
            value={settings.searchEngine}
            onChange={(e) => update({ searchEngine: e.target.value as SearchEngineId })}
            className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-[12.5px] text-[var(--fg-primary)] outline-none"
          >
            {SEARCH_ENGINE_LIST.map((eng) => (
              <option key={eng.id} value={eng.id}>
                {eng.name}
                {eng.embeddable ? "" : " — often refuses to embed"}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            Searches go straight to {getEngine(settings.searchEngine).name}. Lumen keeps no
            remote suggestion feed and records nothing beyond the address it loads.
          </p>

          <Switch
            checked={settings.searchInAddressBar}
            onChange={(v) => update({ searchInAddressBar: v })}
            label="Search from the address bar"
            description="Anything that is not a web address is treated as a search."
          />
        </Group>

        <Group title="Browser">
          <Label>Homepage</Label>
          <input
            value={settings.homepage}
            onChange={(e) => update({ homepage: e.target.value })}
            placeholder="https://example.com"
            className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-[12.5px] outline-none placeholder:text-muted"
          />

          <Label>On startup</Label>
          <Segmented
            options={STARTUPS}
            value={settings.startup}
            onChange={(v) => update({ startup: v })}
          />
        </Group>
      </div>
    </PanelShell>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] font-medium text-[var(--fg-primary)]">{children}</p>;
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  hint,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors ${
              value === o.id
                ? "bg-[var(--bg-surface)] text-[var(--fg-primary)]"
                : "text-muted hover:text-[var(--fg-primary)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
