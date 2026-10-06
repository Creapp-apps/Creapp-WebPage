export default async function handler(req, res) {
  // Configuración de cabeceras CORS
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
    const { email, fullName, password, role } = req.body || {};

    if (!email || !fullName) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (email, fullName)' });
    }

    const apiKey =
      process.env.RESEND_API_KEY ||
      process.env.VITE_RESEND_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'RESEND_API_KEY no configurada en las variables de entorno',
      });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'CreAPP <equipo@creapp.com.ar>';
    const isVendedor = role !== 'admin';
    const roleTitle = isVendedor ? 'Vendedor Comercial (Equipo de Ventas)' : 'Master Admin (Dirección)';
    const loginUrl = 'https://creapp.com.ar/admin/login';

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a CreAPP</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #07080D;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #07080D;
      padding: 40px 15px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #0E121E;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    .gradient-bar {
      height: 4px;
      background: linear-gradient(90deg, #9333EA 0%, #EC4899 50%, #F59E0B 100%);
    }
    .header {
      padding: 36px 40px 24px 40px;
      text-align: center;
      background: radial-gradient(circle at 50% 0%, rgba(147, 51, 234, 0.15) 0%, transparent 70%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 20px;
    }
    .logo-badge img {
      height: 22px;
      width: auto;
      vertical-align: middle;
    }
    .logo-badge span {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: #C084FC;
      text-transform: uppercase;
      font-family: monospace;
    }
    .title {
      font-size: 26px;
      font-weight: 900;
      color: #FFFFFF;
      margin: 0 0 10px 0;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 14px;
      color: #94A3B8;
      margin: 0;
      line-height: 1.5;
    }
    .content {
      padding: 32px 40px;
    }
    .greeting {
      font-size: 16px;
      color: #F1F5F9;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .role-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: ${isVendedor ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)'};
      color: ${isVendedor ? '#60A5FA' : '#C084FC'};
      border: 1px solid ${isVendedor ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'};
    }
    .credentials-box {
      background: #080A12;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 16px;
      padding: 24px;
      margin: 24px 0;
    }
    .credentials-title {
      font-size: 11px;
      font-family: monospace;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #94A3B8;
      margin-bottom: 16px;
      display: block;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 8px;
    }
    .cred-row {
      display: flex;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .cred-label {
      width: 130px;
      color: #64748B;
      font-weight: 500;
    }
    .cred-value {
      color: #FFFFFF;
      font-weight: 700;
      font-family: monospace;
      letter-spacing: 0.02em;
    }
    .cred-password {
      background: rgba(236, 72, 153, 0.1);
      color: #F472B6;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid rgba(236, 72, 153, 0.25);
    }
    .tools-section {
      margin: 28px 0;
    }
    .tools-title {
      font-size: 13px;
      font-weight: 700;
      color: #F1F5F9;
      margin-bottom: 14px;
    }
    .tool-item {
      display: flex;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      margin-bottom: 8px;
    }
    .tool-icon {
      font-size: 18px;
      line-height: 1;
    }
    .tool-text h4 {
      margin: 0 0 2px 0;
      font-size: 12px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .tool-text p {
      margin: 0;
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.4;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0 16px 0;
    }
    .cta-btn {
      display: inline-block;
      background: linear-gradient(135deg, #9333EA 0%, #EC4899 100%);
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 13px;
      font-weight: 800;
      padding: 14px 32px;
      border-radius: 14px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      box-shadow: 0 10px 25px -5px rgba(147, 51, 234, 0.4);
    }
    .note {
      font-size: 11px;
      color: #64748B;
      text-align: center;
      margin-top: 14px;
      line-height: 1.4;
    }
    .footer {
      padding: 24px 40px 32px 40px;
      background: #080A12;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      text-align: center;
    }
    .footer p {
      margin: 4px 0;
      font-size: 11px;
      color: #475569;
    }
    .footer a {
      color: #94A3B8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="gradient-bar"></div>

      <!-- Header -->
      <div class="header">
        <div class="logo-badge">
          <img src="https://creapp.com.ar/logocreapp_new.png" alt="CreAPP" />
          <span>INNOVATION HUB</span>
        </div>
        <h1 class="title">¡Bienvenido a CreAPP!</h1>
        <p class="subtitle">Tu cuenta ha sido creada exitosamente en CreAPP OS.</p>
      </div>

      <!-- Content -->
      <div class="content">
        <p class="greeting">
          Hola <strong>${fullName}</strong>,<br/>
          Te damos la bienvenida al equipo comercial y tecnológico de <strong>CreAPP</strong>. A partir de ahora contás con acceso a nuestra plataforma central como <span class="role-badge">${roleTitle}</span>.
        </p>

        <!-- Credentials Box -->
        <div class="credentials-box">
          <span class="credentials-title">Tus Credenciales de Acceso</span>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748B; width: 130px;">Email de acceso:</td>
              <td style="padding: 6px 0; color: #FFFFFF; font-weight: 700; font-family: monospace;">${email}</td>
            </tr>
            ${
              password
                ? `
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Contraseña inicial:</td>
              <td style="padding: 6px 0;">
                <span class="cred-password">${password}</span>
              </td>
            </tr>
            `
                : ''
            }
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Rol asignado:</td>
              <td style="padding: 6px 0; color: ${isVendedor ? '#60A5FA' : '#C084FC'}; font-weight: 600;">
                ${isVendedor ? 'Ventas & Crecimiento' : 'Master Admin'}
              </td>
            </tr>
          </table>
        </div>

        <!-- Herramientas habilitadas -->
        <div class="tools-section">
          <div class="tools-title">Tus herramientas habilitadas en CreAPP OS:</div>

          <div class="tool-item">
            <div class="tool-icon">📡</div>
            <div class="tool-text">
              <h4>Lead Scraper & Radar B2B</h4>
              <p>Prospección geolocalizada de comercios y empresas con diagnóstico digital e IA.</p>
            </div>
          </div>

          <div class="tool-item">
            <div class="tool-icon">📊</div>
            <div class="tool-text">
              <h4>Pipeline CRM</h4>
              <p>Seguimiento de prospectos por etapas (Contacto, Diagnóstico, Propuesta y Negociación).</p>
            </div>
          </div>

          <div class="tool-item">
            <div class="tool-icon">📄</div>
            <div class="tool-text">
              <h4>Creador de Propuestas Comerciales</h4>
              <p>Generación de presupuestos con cronograma, video de pitch interactivo y firma de contrato digital.</p>
            </div>
          </div>
        </div>

        <!-- Call to Action -->
        <div class="cta-container">
          <a href="${loginUrl}" target="_blank" class="cta-btn">
            Ingresar al Panel CreAPP &rarr;
          </a>
          <p class="note">
            💡 <em>Podés cambiar tu contraseña en cualquier momento ingresando a <strong>"Mi Perfil"</strong> en la esquina superior derecha del panel.</em>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p><strong>CreAPP</strong> • Fintech & Software Innovation Lab</p>
        <p>Buenos Aires, Argentina • <a href="https://creapp.com.ar" target="_blank">creapp.com.ar</a></p>
        <p style="margin-top: 10px; color: #334155; font-size: 10px;">
          Este correo fue emitido automáticamente por la plataforma de administración de CreAPP para uso exclusivo del destinatario.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Envío a través de Resend API con fallback automático si el dominio no está verificado aún
    let resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `👋 ¡Bienvenido al equipo de CreAPP, ${fullName}! Tus credenciales de acceso`,
        html: htmlContent,
      }),
    });

    let resendData = await resendResponse.json();

    // Si el dominio personalizado creapp.com.ar aún no tiene DNS verificados en Resend, reintentar con el sender verificado
    if (!resendResponse.ok && (resendResponse.status === 403 || resendData.message?.toLowerCase().includes('domain') || resendData.message?.toLowerCase().includes('not verified'))) {
      console.warn('Reintentando envío mediante sender verificado onboarding@resend.dev...');
      resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'CreAPP <onboarding@resend.dev>',
          to: [email],
          subject: `👋 ¡Bienvenido al equipo de CreAPP, ${fullName}! Tus credenciales de acceso`,
          html: htmlContent,
        }),
      });
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
      message: 'Email de bienvenida enviado con éxito',
    });
  } catch (error) {
    console.error('Unexpected error in send-welcome-email handler:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor',
    });
  }
}
