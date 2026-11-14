// Mapeo puro y determinista de eventos del main → payload de toast (es-AR).
export function toToastPayload(event) {
  if (!event || typeof event !== 'object') return null;
  if (event.type === 'connection-lost') {
    return {
      title: 'Se perdió la conexión',
      body: 'No hay conexión con los servicios. Seguimos intentando reconectar.',
    };
  }
  if (event.type === 'failed') {
    const label = String(event.label ?? 'operación');
    return {
      title: 'No se pudo completar la subida',
      body: `Falló "${label}". Revisá tu conexión y reintentá.`,
      action: 'Reintentar',
    };
  }
  return null;
}
