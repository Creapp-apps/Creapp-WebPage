export default async function handler(req, res) {
  // Configurar cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { query = '', lat, lng, radius = '2500', fetchAll = 'false', pagetoken } = req.query;
    const key = req.query.key || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!key) {
      return res.status(200).json({ success: true, hasGoogleKey: false, results: [] });
    }

    let rawResults = [];
    let nextPageToken = null;

    // Si se envió un pagetoken específico (para cargar la siguiente página)
    if (pagetoken) {
      const pageUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${encodeURIComponent(
        pagetoken
      )}&key=${key}`;
      const pageRes = await fetch(pageUrl);
      const pageData = await pageRes.json();
      rawResults = pageData.results || [];
      nextPageToken = pageData.next_page_token || null;
    } else {
      let placesData = null;

      // Si se enviaron coordenadas geográficas (del Radar), consultar Nearby Search API
      if (lat && lng) {
        const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(
          query
        )}&language=es&key=${key}`;
        const nearbyRes = await fetch(nearbyUrl);
        placesData = await nearbyRes.json();
      }

      // Fallback a Text Search si no hay coordenadas o no arrojó resultados cercanos
      if (!placesData || placesData.status === 'ZERO_RESULTS' || !placesData.results?.length) {
        const textUrl =
          lat && lng
            ? `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
                query
              )}&location=${lat},${lng}&radius=${radius}&language=es&key=${key}`
            : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
                query
              )}&language=es&key=${key}`;
        const textRes = await fetch(textUrl);
        const textData = await textRes.json();
        if (textData.status === 'OK' || !placesData) {
          placesData = textData;
        }
      }

      if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
        return res.status(200).json({
          success: false,
          hasGoogleKey: true,
          error: placesData.error_message || placesData.status,
          results: [],
        });
      }

      rawResults = [...(placesData.results || [])];
      nextPageToken = placesData.next_page_token || null;

      // Si fetchAll es true y Google tiene más páginas (hasta 60 resultados máx permitido por Google)
      if (fetchAll === 'true' && nextPageToken) {
        try {
          // Google requiere al menos 2000ms antes de que el pagetoken sea válido
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const p2Url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${encodeURIComponent(
            nextPageToken
          )}&key=${key}`;
          const p2Res = await fetch(p2Url);
          const p2Data = await p2Res.json();
          if (p2Data.results?.length) {
            rawResults = [...rawResults, ...p2Data.results];
            nextPageToken = p2Data.next_page_token || null;

            // Página 3 (tope final de Google Places API)
            if (nextPageToken) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              const p3Url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${encodeURIComponent(
                nextPageToken
              )}&key=${key}`;
              const p3Res = await fetch(p3Url);
              const p3Data = await p3Res.json();
              if (p3Data.results?.length) {
                rawResults = [...rawResults, ...p3Data.results];
                nextPageToken = null; // Alcanzado el tope máximo de Google
              }
            }
          }
        } catch (e) {
          // Si falla alguna página extra, nos quedamos con los resultados ya obtenidos
        }
      }
    }

    // Enriquecer TODOS los prospectos con teléfono y sitio web mediante Place Details en paralelo
    const enriched = await Promise.all(
      rawResults.map(async (place) => {
        let phone = '';
        let website = '';
        try {
          if (place.place_id) {
            const detRes = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,international_phone_number,website&key=${key}`
            );
            const detData = await detRes.json();
            if (detData.result) {
              phone =
                detData.result.international_phone_number ||
                detData.result.formatted_phone_number ||
                '';
              website = detData.result.website || '';
            }
          }
        } catch (e) {
          // ignore detail failure
        }

        return {
          place_id: place.place_id,
          name: place.name,
          address: place.vicinity || place.formatted_address || '',
          rating: place.rating || 0,
          user_ratings_total: place.user_ratings_total || 0,
          lat: place.geometry?.location?.lat,
          lng: place.geometry?.location?.lng,
          phone,
          website,
          types: place.types || [],
        };
      })
    );

    return res.status(200).json({
      success: true,
      hasGoogleKey: true,
      results: enriched,
      nextPageToken,
      totalCount: enriched.length,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al consultar Google Places API',
      details: err?.message,
    });
  }
}
