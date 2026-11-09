import type React from 'react';

export const shell: React.CSSProperties = { display: 'grid', placeItems: 'center', padding: '24px 16px' };
export const card: React.CSSProperties = {
  width: '100%', maxWidth: 420, padding: '32px 28px', borderRadius: 18,
  border: '1px solid var(--line)', background: 'linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01))',
};
export const input: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)',
  background: 'rgba(255,255,255,.04)', color: 'var(--ink)', fontSize: 15, outline: 'none',
};
export const label: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--muted)', margin: '14px 0 6px' };
export const button: React.CSSProperties = {
  width: '100%', marginTop: 22, padding: '13px 16px', borderRadius: 999, border: '1px solid rgba(192,132,87,.5)',
  background: 'rgba(192,132,87,.18)', color: 'var(--cream)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
};
export const errorBox: React.CSSProperties = {
  marginTop: 16, padding: '10px 12px', borderRadius: 10, fontSize: 13, color: '#fecaca',
  background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.35)',
};
