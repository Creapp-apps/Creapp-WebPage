// Vercel Serverless Function to dispatch FCM push notifications
// CreAPP Software Lab • Push Notification Engine

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { token, tokens, title, body, url = '/admin', data = {} } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'Missing title or body in request body.' });
    }

    const targetTokens = tokens && Array.isArray(tokens) ? tokens : token ? [token] : [];

    // Check if Firebase Server Key or credentials are provided in env
    const serverKey = process.env.FIREBASE_SERVER_KEY || process.env.FCM_SERVER_KEY;

    if (!serverKey) {
      // In development or when server key is not yet pasted in Vercel:
      // Return a simulated success response so the client continues cleanly
      return res.status(200).json({
        success: true,
        mode: 'simulated',
        message: 'Notification received. Configure FIREBASE_SERVER_KEY in Vercel to dispatch real background Web Push.',
        payload: { title, body, url, targetCount: targetTokens.length },
      });
    }

    // Dispatch via FCM Legacy HTTP API (Simple & universal)
    const results = [];
    for (const deviceToken of targetTokens) {
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${serverKey}`,
          },
          body: JSON.stringify({
            to: deviceToken,
            notification: {
              title,
              body,
              icon: '/icon-192.png',
              click_action: url,
            },
            data: {
              url,
              ...data,
            },
          }),
        });

        const json = await response.json();
        results.push({ token: deviceToken.slice(0, 10) + '...', result: json });
      } catch (tokenErr) {
        results.push({ token: deviceToken.slice(0, 10) + '...', error: tokenErr.message });
      }
    }

    return res.status(200).json({
      success: true,
      mode: 'live',
      sent: targetTokens.length,
      results,
    });
  } catch (err) {
    console.error('[API/send-fcm-notification] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
