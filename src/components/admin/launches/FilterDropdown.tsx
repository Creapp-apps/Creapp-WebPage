import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface FilterOption { value: string; label: string }

export const FilterDropdown: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  ariaLabel: string;
}> = ({ value, onChange, options, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0e0e12] border border-white/5 hover:border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/40 transition-colors"
      >
        <span>{current?.label}</span>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 z-30 mt-2 min-w-full w-max max-h-72 overflow-y-auto rounded-xl bg-[#141418] border border-white/10 p-1 shadow-2xl shadow-black/60"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-sm text-left transition-colors focus:outline-none focus:bg-indigo-500/20 hover:bg-indigo-500/20 ${selected ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-300'}`}
              >
                <span>{o.label}</span>
                {selected && <Check size={14} className="text-indigo-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
