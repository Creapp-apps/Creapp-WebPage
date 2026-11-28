import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type CampaignOption = { id: string; label: string };

type Props = {
  value: string;
  options: CampaignOption[];
  onChange: (id: string) => void;
};

/**
 * Selector de campaña propio del portal (no el <select> nativo del navegador).
 * Usa los tokens del theming dinámico: --ink (texto, claro en todo tema),
 * --navy2 (superficie del menú) y --wood (acento). Legible en cualquier campaña.
 */
export const CampaignSelect: React.FC<Props> = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.id === value) ?? options[0];
  const label = current?.label ?? 'Campaña';

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((o) => o.id === value)));
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const opt = options[active];
        if (opt) { onChange(opt.id); setOpen(false); }
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, options, value, active, onChange]);

  return (
    <div className="cs-field" ref={rootRef}>
      <button
        type="button"
        className="cs-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cs-cur">{label}</span>
        <ChevronDown size={15} className={`cs-chev${open ? ' is-open' : ''}`} aria-hidden />
      </button>
      {open && (
        <ul className="cs-menu" role="listbox" aria-label="Elegir campaña">
          {options.map((o, i) => {
            const selected = o.id === value;
            return (
              <li key={o.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`cs-opt${selected ? ' is-selected' : ''}${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => { onChange(o.id); setOpen(false); }}
                >
                  <span className="cs-check">{selected && <Check size={14} aria-hidden />}</span>
                  <span className="cs-opt-lab">{o.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
