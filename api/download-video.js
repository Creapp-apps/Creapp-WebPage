export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(501).json({
    error: 'La descarga de videos renderizados localmente solo está disponible en el servidor local de desarrollo.',
  });
}
