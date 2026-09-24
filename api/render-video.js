export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(501).json({
    error: 'El renderizado directo a MP4 requiere ejecución en entorno local.',
    details: 'Remotion CLI utiliza Chromium y FFmpeg en el sistema operativo local para procesar los 1.260 fotogramas. Para exportar el video .mp4, ejecuta la aplicación localmente en localhost:3000 con `npm run dev` o previsualiza el video interactivo directamente en la pestaña VIDEO.',
    isProduction: true,
  });
}
