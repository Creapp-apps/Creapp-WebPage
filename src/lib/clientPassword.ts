// Generador de contraseña fuerte y legible para entregar a un cliente del portal.
// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para dictar/copiar sin errores.

const LOWER = 'abcdefghijkmnpqrstuvwxyz'; // sin l, o
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I, O
const DIGIT = '23456789'; // sin 0, 1

export const SAFE_ALPHABET = LOWER + UPPER + DIGIT;

const MIN_LENGTH = 12;

/** Entero uniforme en [0, max) sin sesgo de módulo, con crypto. */
function randomIndex(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limit);
  return n % max;
}

function pick(chars: string): string {
  return chars[randomIndex(chars.length)];
}

/**
 * Clave de `length` caracteres (default 14). Garantiza al menos una minúscula,
 * una mayúscula y un dígito; el resto sale del alfabeto seguro completo.
 */
export function generateStrongPassword(length = 14): string {
  if (length < MIN_LENGTH) {
    throw new Error(`La contraseña necesita al menos ${MIN_LENGTH} caracteres.`);
  }
  const out: string[] = [pick(LOWER), pick(UPPER), pick(DIGIT)];
  while (out.length < length) out.push(pick(SAFE_ALPHABET));

  // Shuffle Fisher-Yates para no dejar fijas las posiciones garantizadas.
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}
