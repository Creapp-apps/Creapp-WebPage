export type ShareCaps = { canShareFiles: (file: File) => boolean; canShareUrl: boolean };
export type ShareMode = 'file' | 'link' | 'menu';

export function planShare(opts: { file: File | null; permalink: string | null; caps: ShareCaps }): ShareMode {
  const { file, permalink, caps } = opts;
  if (file && caps.canShareFiles(file)) return 'file';
  if (permalink && caps.canShareUrl) return 'link';
  return 'menu';
}

export function nextFallback(mode: ShareMode): ShareMode | null {
  if (mode === 'file') return 'link';
  if (mode === 'link') return 'menu';
  return null;
}
