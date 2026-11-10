const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, fullName, brandName, activationLink } = req.body || {};

    if (!email || !brandName || !activationLink) {
      return res
        .status(400)
        .json({ error: 'Faltan parámetros requeridos (email, brandName, activationLink)' });
    }

    const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'RESEND_API_KEY no configurada en las variables de entorno',
      });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'CreAPP <equipo@creapp.com.ar>';
    const brand = escapeHtml(brandName);
    const name = fullName ? escapeHtml(fullName) : '';
    const link = escapeHtml(activationLink);

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu portal de campañas · ${brand}</title>
</head>
<body style="margin:0;padding:0;background-color:#07080D;">
  <div style="background-color:#07080D;padding:40px 15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
    <div style="max-width:600px;margin:0 auto;background:#0E121E;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
      <div style="height:4px;background:linear-gradient(90deg,#9333EA 0%,#EC4899 50%,#F59E0B 100%);"></div>
      <div style="padding:36px 40px 24px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);">
        <img src="https://creapp.com.ar/logocreapp_new.png" alt="CreAPP" style="height:26px;width:auto;margin-bottom:18px;" />
        <h1 style="font-size:26px;font-weight:900;color:#FFFFFF;margin:0 0 10px 0;letter-spacing:-0.02em;">Tu portal de campañas</h1>
        <p style="font-size:14px;color:#94A3B8;margin:0;line-height:1.5;">${brand}</p>
      </div>
      <div style="padding:32px 40px;">
        <p style="font-size:16px;color:#F1F5F9;line-height:1.6;margin:0 0 16px 0;">
          ${name ? `Hola <strong>${name}</strong>,<br/>` : 'Hola,<br/>'}
          Ya está listo tu portal de <strong>${brand}</strong>. Ahí vas a poder ver y aprobar las piezas de tus campañas, y dejar tus comentarios en un solo lugar.
        </p>
        <p style="font-size:15px;color:#CBD5E1;line-height:1.6;margin:0;">
          Para empezar, activá tu acceso y elegí tu contraseña:
        </p>
        <p style="text-align:center;margin:32px 0;">
          <a href="${link}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#9333EA 0%,#EC4899 100%);color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:800;padding:14px 32px;border-radius:14px;letter-spacing:0.08em;text-transform:uppercase;">Activar mi acceso</a>
        </p>
        <p style="font-size:12px;color:#94A3B8;line-height:1.5;margin:0;">
          Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br/>
          <span style="color:#C084FC;word-break:break-all;">${link}</span>
        </p>
      </div>
      <div style="padding:24px 40px 32px 40px;background:#080A12;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
        <p style="margin:4px 0;font-size:11px;color:#475569;"><strong>CreAPP</strong> • Software Innovation Lab</p>
        <p style="margin:4px 0;font-size:11px;color:#475569;">Buenos Aires, Argentina • <a href="https://creapp.com.ar" target="_blank" style="color:#94A3B8;text-decoration:none;">creapp.com.ar</a></p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const subject = `Tu portal de campañas · ${brandName}`;
    const send = (from) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ from, to: [email], subject, html: htmlContent }),
      });

    let resendResponse = await send(fromEmail);
    let resendData = await resendResponse.json();

    // Si el dominio aún no está verificado en Resend, reintentar con el sender verificado
    if (
      !resendResponse.ok &&
      (resendResponse.status === 403 ||
        resendData.message?.toLowerCase().includes('domain') ||
        resendData.message?.toLowerCase().includes('not verified'))
    ) {
      console.warn('Reintentando envío mediante sender verificado onboarding@resend.dev...');
      resendResponse = await send('CreAPP <onboarding@resend.dev>');
      resendData = await resendResponse.json();
    }

    if (!resendResponse.ok) {
      console.error('Error from Resend API:', resendData);
      return res.status(resendResponse.status).json({
        success: false,
        error: resendData.message || 'Error al enviar email mediante Resend',
      });
    }

    return res.status(200).json({
      success: true,
      id: resendData.id,
      message: 'Invitación al portal enviada con éxito',
    });
  } catch (error) {
    console.error('Unexpected error in send-portal-invite handler:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor',
    });
  }
}
