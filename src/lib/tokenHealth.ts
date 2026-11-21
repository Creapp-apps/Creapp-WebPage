// Helper puro: mapea la respuesta de Graph /debug_token al contrato del pre-flight.
export interface TokenHealth {
  is_valid: boolean;
  expires_at: number | null;
  error: string | null;
}

export function parseDebugToken(json: any): TokenHealth {
  const data = json?.data;
  if (!data) {
    return { is_valid: false, expires_at: null, error: json?.error?.message ?? 'respuesta inválida de Graph' };
  }
  const is_valid = data.is_valid === true;
  const exp = Number(data.expires_at);
  const expires_at = Number.isFinite(exp) && exp > 0 ? exp : null;
  const error = is_valid ? null : (data.error?.message ?? 'token inválido');
  return { is_valid, expires_at, error };
}
