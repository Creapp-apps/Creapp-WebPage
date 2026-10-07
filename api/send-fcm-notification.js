// Vercel Serverless Function to dispatch FCM push notifications
// CreAPP Software Lab • Push Notification Engine

import { createClient } from '@supabase/supabase-js';

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
    const {
      token,
      tokens,
      targetRole = 'all', // 'all' | 'admin' | 'sales'
      targetUserId,
      title,
      body,
      url = '/admin',
      type = 'system',
      data = {},
    } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'Missing title or body in request body.' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yjrqpjlzyxivwpfcatvt.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcnFwamx6eXhpdndwZmNhdHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTgwNzIsImV4cCI6MjA4ODg5NDA3Mn0.8OLnhISJn6z07yZJIqrSouvb7m9kf1htQukWdeTClH8';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Resolve target device tokens
    let targetTokens = tokens && Array.isArray(tokens) ? [...tokens] : token ? [token] : [];

    if (targetTokens.length === 0) {
      try {
        let tokenQuery = supabase.from('user_fcm_tokens').select('fcm_token, user_id').eq('is_active', true);

        if (targetUserId) {
          tokenQuery = tokenQuery.eq('user_id', targetUserId);
        }

        const { data: foundTokens, error: tokenError } = await tokenQuery;
        if (!tokenError && foundTokens) {
          // If role-specific targeting is needed:
          if (targetRole === 'admin' && !targetUserId) {
            const { data: adminProfiles } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('role', 'admin');
            const adminIds = new Set((adminProfiles || []).map((p) => p.id));
            targetTokens = foundTokens
              .filter((t) => !t.user_id || adminIds.has(t.user_id))
              .map((t) => t.fcm_token);
          } else {
            targetTokens = foundTokens.map((t) => t.fcm_token);
          }
        }
      } catch (lookupErr) {
        console.warn('[FCM] Token lookup warning:', lookupErr.message);
      }
    }

    // Deduplicate tokens
    targetTokens = Array.from(new Set(targetTokens.filter(Boolean)));

    // 2. Persist notification to app_notifications table (if table exists)
    try {
      await supabase.from('app_notifications').insert([
        {
          type,
          title,
          body,
          url,
          target_role: targetRole,
          target_user_id: targetUserId || null,
          metadata: data,
        },
      ]);
    } catch (insertErr) {
      // Gracefully continue if table is not yet created
    }

    // 3. Dispatch via FCM
    const serverKey = process.env.FIREBASE_SERVER_KEY || process.env.FCM_SERVER_KEY;

    if (!serverKey) {
      return res.status(200).json({
        success: true,
        mode: 'simulated',
        message: 'Notification stored. Real background push requires FIREBASE_SERVER_KEY in environment.',
        payload: { title, body, url, targetCount: targetTokens.length },
      });
    }

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
              type,
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
