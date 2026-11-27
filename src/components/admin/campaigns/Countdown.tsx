import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatCountdown } from '@/lib/contentTrackerView';

/** Badge de cuenta regresiva en tiempo real hasta la publicación programada. */
export const Countdown: React.FC<{ target: string }> = ({ target }) => {
  const targetMs = new Date(target).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-indigo-500/10 text-indigo-300 border-indigo-500/20 tabular-nums"
      title={Number.isNaN(targetMs) ? undefined : new Date(target).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}
    >
      <Clock size={11} /> {formatCountdown(targetMs - now)}
    </span>
  );
};
