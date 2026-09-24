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
    const { query = '', lat, lng, radius = '2500' } = req.query;
    const key = req.query.key || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!key) {
      return res.status(200).json({ success: true, hasGoogleKey: false, results: [] });
    }

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

    const rawResults = placesData.results || [];
    // Enriquecer prospectos con número de teléfono y sitio web mediante Place Details
    const enriched = await Promise.all(
      rawResults.slice(0, 10).map(async (place) => {
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

    return res.status(200).json({ success: true, hasGoogleKey: true, results: enriched });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al consultar Google Places API',
      details: err?.message,
    });
  }
}
