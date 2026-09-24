export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).send('Falta el parámetro slug');
  }

  const cleanSlug = String(slug).trim().toLowerCase();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yjrqpjlzyxivwpfcatvt.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcnFwamx6eXhpdndwZmNhdHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTgwNzIsImV4cCI6MjA4ODg5NDA3Mn0.8OLnhISJn6z07yZJIqrSouvb7m9kf1htQukWdeTClH8';

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/proposals?slug=eq.${encodeURIComponent(cleanSlug)}&select=id,slug,client_name,description,client_logo_url,brand_color_primary,methodology`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const data = await response.json();
    const proposal = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!proposal) {
      return res.status(404).send('Propuesta no encontrada');
    }

    const meth = proposal.methodology || {};
    const isService = meth.proposal_type === 'service';
    const clientName = meth.client_legal_data?.company_name?.trim() || proposal.client_name?.trim() || 'Cliente';
    const productId = meth.product_id || 'stacked';
    const serviceDetails = meth.service_details || {};
    const recurringFee = serviceDetails.recurring_fee || '';
    const slaUptime = serviceDetails.sla_uptime || '99.5%';

    let productName = 'Stacked';
    let productLogo = 'https://creapp.com.ar/products/stacked-logo.png';

    if (productId === 'trazapp') {
      productName = 'Trazapp';
      productLogo = 'https://creapp.com.ar/products/trazapp-logo.png';
    } else if (productId === 'dental-ia') {
      productName = 'Dental-IA';
      productLogo = 'https://creapp.com.ar/products/dentalia-logo.png';
    }

    let title = '';
    let description = '';
    let imageUrl = '';
    let siteName = '';

    if (isService) {
      title = `Contrato de Servicio ${productName} – ${clientName}`;
      description = `Acuerdo oficial de prestación de servicios, nivel de servicio (SLA ${slaUptime}) y suscripción a la plataforma ${productName}${recurringFee ? ` (${recurringFee})` : ''} para ${clientName}. Accedé para revisar las cláusulas y firmar digitalmente.`;
      siteName = `${productName} | Contrato de Servicio`;
      
      if (proposal.client_logo_url) {
        imageUrl = proposal.client_logo_url.startsWith('http')
          ? proposal.client_logo_url
          : `https://creapp.com.ar${proposal.client_logo_url}`;
      } else {
        imageUrl = productLogo;
      }
    } else {
      title = `Propuesta Comercial – ${clientName}`;
      description = proposal.description || `Dossier oficial de propuesta técnica y comercial de desarrollo de software preparada para ${clientName}. CreAPP Software Lab.`;
      siteName = `CreAPP Software Lab`;
      
      if (proposal.client_logo_url) {
        imageUrl = proposal.client_logo_url.startsWith('http')
          ? proposal.client_logo_url
          : `https://creapp.com.ar${proposal.client_logo_url}`;
      } else {
        imageUrl = 'https://creapp.com.ar/logocreapp_new.png';
      }
    }

    const canonicalUrl = `https://creapp.com.ar/propuesta/${cleanSlug}`;
    const brandColor = proposal.brand_color_primary || '#FF6B2C';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');

    return res.status(200).send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph / WhatsApp / Facebook / LinkedIn -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${canonicalUrl}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

  <meta name="theme-color" content="${escapeHtml(brandColor)}" />

  <!-- Redirección automática inmediata para navegadores convencionales -->
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}" />
  <script>
    if (typeof window !== 'undefined') {
      window.location.replace("${canonicalUrl}");
    }
  </script>
</head>
<body style="background:#090d16;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center;box-sizing:border-box;">
  <div style="max-width:540px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:32px;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
    <div style="margin-bottom:16px;">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" style="height:60px;max-width:180px;object-fit:contain;" />
    </div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 10px 0;letter-spacing:-0.5px;">${escapeHtml(title)}</h2>
    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 24px 0;">${escapeHtml(description)}</p>
    <a href="${canonicalUrl}" style="display:inline-block;background:${escapeHtml(brandColor)};color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;padding:12px 24px;border-radius:12px;box-shadow:0 4px 15px rgba(255,107,44,0.3);">
      Abrir Contrato para Firmar &rarr;
    </a>
  </div>
</body>
</html>`);
  } catch (error) {
    console.error('Error in og handler:', error);
    return res.status(500).send('Error interno');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
