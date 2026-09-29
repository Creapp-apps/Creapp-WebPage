/**
 * Servicio de envío de emails transaccionales mediante Resend
 * CreApp Innovation Hub
 */

export interface WelcomeEmailParams {
  email: string;
  fullName: string;
  password?: string;
  role?: 'admin' | 'vendedor';
}

export const sendWelcomeEmail = async (
  params: WelcomeEmailParams
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Intentar llamar al endpoint serverless de Vercel (/api/send-welcome-email)
    const response = await fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true };
    }

    // 2. Si dio 404 (por ejemplo corriendo en vite local sin vercel dev), o error de ruta
    if (response.status === 404) {
      console.warn(
        'Endpoint /api/send-welcome-email no disponible localmente en Vite. Utilizando fallback directo con Resend...'
      );
      return await sendWelcomeEmailDirectFallback(params);
    }

    const errData = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errData.error || `Error ${response.status} al enviar email`,
    };
  } catch (err: any) {
    console.warn('Error llamando a /api/send-welcome-email, intentando fallback directo:', err);
    return await sendWelcomeEmailDirectFallback(params);
  }
};

/**
 * Fallback directo por si se ejecuta en local sin Vercel Functions
 */
async function sendWelcomeEmailDirectFallback(
  params: WelcomeEmailParams
): Promise<{ success: boolean; error?: string }> {
    const apiKey = import.meta.env.VITE_RESEND_API_KEY as string;

    if (!apiKey) {
      console.warn('VITE_RESEND_API_KEY no definida en el cliente');
      return { success: false, error: 'VITE_RESEND_API_KEY no configurada' };
    }

    const isVendedor = params.role !== 'admin';
    const roleTitle = isVendedor ? 'Vendedor Comercial (Equipo de Ventas)' : 'Master Admin (Dirección)';
    const loginUrl = 'https://creapp.com.ar/admin/login';

    const html = `
      <div style="background-color: #07080D; padding: 30px; font-family: sans-serif; color: #E2E8F0;">
        <div style="max-width: 580px; margin: 0 auto; background: #0E121E; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <div style="height: 3px; background: linear-gradient(90deg, #9333EA, #EC4899, #F59E0B); margin: -32px -32px 24px -32px; border-radius: 20px 20px 0 0;"></div>
          <h2 style="color: #FFFFFF; font-size: 24px; margin-top: 0;">¡Bienvenido a CreAPP! 🚀</h2>
          <p style="font-size: 15px; color: #CBD5E1; line-height: 1.5;">
            Hola <strong>${params.fullName}</strong>,<br/>
            Has sido dado de alta en CreAPP OS con el rol <strong>${roleTitle}</strong>.
          </p>
          <div style="background: #080A12; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #94A3B8; font-family: monospace;">Tus Credenciales:</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> <span style="font-family: monospace; color: #FFFFFF;">${params.email}</span></p>
            ${params.password ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Contraseña:</strong> <span style="font-family: monospace; color: #F472B6; background: rgba(236,72,153,0.15); padding: 2px 6px; border-radius: 4px;">${params.password}</span></p>` : ''}
          </div>
          <p style="margin: 25px 0; text-align: center;">
            <a href="${loginUrl}" style="background: linear-gradient(135deg, #9333EA, #EC4899); color: #FFFFFF; text-decoration: none; font-weight: bold; padding: 12px 28px; border-radius: 10px; display: inline-block; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">
              Ingresar al Panel CreAPP &rarr;
            </a>
          </p>
          <p style="font-size: 11px; color: #64748B; text-align: center; margin-top: 20px;">
            CreAPP • Software & Fintech Innovation Lab • <a href="https://creapp.com.ar" style="color: #94A3B8;">creapp.com.ar</a>
          </p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'CreAPP <onboarding@resend.dev>',
        to: [params.email],
        subject: `👋 ¡Bienvenido al equipo de CreAPP, ${params.fullName}! Tus credenciales`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || 'Error en Resend API' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
