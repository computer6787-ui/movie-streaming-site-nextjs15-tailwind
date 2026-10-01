"use client";

import { useState, useEffect } from "react";
import { PROVIDERS } from "@/lib/providers";

/**
 * Provider switcher component that allows users to switch between different
 * video embed providers.
 * 
 * Stores the selected provider in localStorage for persistence across sessions.
 */
export default function ProviderSwitcher({ currentProvider, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
      if (isOpen && !e.target.closest("[data-provider-switcher]")) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div 
      className="relative" 
      data-provider-switcher
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/50 px-3 py-2 text-[11px] font-medium text-ink-300 backdrop-blur-sm transition-all duration-200 hover:border-ink-600 hover:bg-ink-800/80 hover:text-ink-100"
        aria-label="Select video provider"
        aria-expanded={isOpen}
      >
        <svg 
          className="size-3.5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          strokeWidth={2}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" 
          />
        </svg>
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[9px] text-ink-500 uppercase tracking-wider">
            Switch Provider
          </span>
          <span className="text-[11px] font-semibold tracking-wide uppercase text-ink-200">
            {PROVIDERS.find(p => p.id === currentProvider)?.name || 'Provider'}
          </span>
        </div>
        <svg 
          className={`size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2.5rem)] max-w-xs sm:w-auto sm:min-w-[280px] overflow-hidden rounded-lg border border-ink-700 bg-ink-900/95 backdrop-blur-md [box-shadow:var(--elev-3)]">
          <div className="p-1.5 space-y-0.5">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  onChange(provider.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[12px] font-medium transition-colors duration-150 ${
                  currentProvider === provider.id
                    ? "bg-chit-500/20 text-chit-400"
                    : "text-ink-300 hover:bg-ink-800/80 hover:text-ink-100"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {currentProvider === provider.id ? (
                    <svg 
                      className="size-3.5 shrink-0 text-chit-400" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  ) : (
                    <span className="size-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate font-medium">{provider.name}</span>
                  {provider.default && (
                    <span className="shrink-0 rounded bg-chit-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-chit-400 uppercase tracking-wider">
                      Default
                    </span>
                  )}
                </div>
                {provider.tag && (
                  <span className="shrink-0 rounded bg-ink-800/80 px-1.5 py-0.5 text-[9.5px] font-normal text-ink-400 whitespace-nowrap">
                    {provider.tag}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-ink-800 bg-ink-950/50 px-3 py-2">
            <p className="text-[10px] leading-relaxed text-ink-500">
              Switch providers if playback fails or quality is poor
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
