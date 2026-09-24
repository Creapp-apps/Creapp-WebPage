import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Crosshair,
  Maximize2,
  Minimize2,
  Navigation,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { ScrapedProspect } from '@/lib/scraperService';

interface GoogleRadarMapProps {
  apiKey: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  prospects: ScrapedProspect[];
  selectedProspect?: ScrapedProspect | null;
  onCenterChange: (center: { lat: number; lng: number }, addressName?: string) => void;
  onRadiusChange: (radiusMeters: number) => void;
  onSelectProspect: (prospect: ScrapedProspect) => void;
  onOpenPitch: (prospect: ScrapedProspect) => void;
  onOpenDossier?: (prospect: ScrapedProspect) => void;
  onImportToPipeline: (prospect: ScrapedProspect) => void;
}

// Dark Cyberpunk / Obsidian theme for Google Maps
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0c0c12' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c0c12' }, { weight: 2 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b8da3' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c084fc' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a855f7' }, { visibility: 'simplified' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#11111a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#171722' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#222233' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#24143d' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3b0764' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#060609' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#334155' }],
  },
];

export const GoogleRadarMap: React.FC<GoogleRadarMapProps> = ({
  apiKey,
  center,
  radiusMeters,
  prospects,
  selectedProspect,
  onCenterChange,
  onRadiusChange,
  onSelectProspect,
  onOpenPitch,
  onOpenDossier,
  onImportToPipeline,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addressSearch, setAddressSearch] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Carga dinámica y detección segura de Google Maps SDK
  useEffect(() => {
    let checkInterval: any = null;

    const checkGoogleMapsReady = () => {
      const g = typeof window !== 'undefined' ? (window as any).google : null;
      if (g && g.maps && g.maps.Map) {
        setMapLoaded(true);
        setLoadError(null);
        if (checkInterval) clearInterval(checkInterval);
        return true;
      }
      return false;
    };

    if (checkGoogleMapsReady()) {
      return;
    }

    if (!apiKey) {
      setLoadError('Se requiere una clave API de Google Maps para inicializar el Radar.');
      return;
    }

    // Inyectar el SDK de Google Maps dinámicamente si no existe
    const scriptId = 'creapp-gmaps-sdk-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry&loading=async`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Polling cada 150ms hasta que el script termine de inicializar
    checkInterval = setInterval(() => {
      checkGoogleMapsReady();
    }, 150);

    const timeout = setTimeout(() => {
      if (checkInterval) clearInterval(checkInterval);
      const g = typeof window !== 'undefined' ? (window as any).google : null;
      if (!g?.maps?.Map) {
        setLoadError('Esperando que Google Maps termine de inicializar...');
      }
    }, 10000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [apiKey]);

  // 2. Inicializar el mapa de forma 100% segura
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current) return;
    const gmaps = typeof window !== 'undefined' ? (window as any).google?.maps : null;
    if (!gmaps || !gmaps.Map) return;

    try {
      const map = new gmaps.Map(mapContainerRef.current, {
        center,
        zoom: getZoomForRadius(radiusMeters),
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        backgroundColor: '#0c0c12',
      });

      // Marker central arrastrable (Radar Target)
      const centerMarker = new gmaps.Marker({
        position: center,
        map,
        draggable: true,
        title: '🎯 Centro del Radar de Búsqueda (Arrastra para mover)',
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#c084fc',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      // Círculo de cobertura geográfica
      const circle = new gmaps.Circle({
        map,
        center,
        radius: radiusMeters,
        strokeColor: '#a855f7',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: '#7c3aed',
        fillOpacity: 0.12,
        clickable: false,
      });

      // Al arrastrar el pin central
      centerMarker.addListener('dragend', (e: any) => {
        if (e.latLng) {
          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          circle.setCenter(newPos);
          reverseGeocode(newPos);
        }
      });

      // Al hacer clic en cualquier punto del mapa, reubicar el centro
      map.addListener('click', (e: any) => {
        if (e.latLng) {
          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          centerMarker.setPosition(newPos);
          circle.setCenter(newPos);
          reverseGeocode(newPos);
        }
      });

      mapInstanceRef.current = map;
      centerMarkerRef.current = centerMarker;
      circleRef.current = circle;
      infoWindowRef.current = new gmaps.InfoWindow();
    } catch (e: any) {
      setLoadError(e.message || 'Error inicializando el mapa');
    }
  }, [mapLoaded]);

  // Función para obtener nombre de calle/barrio al mover el pin
  const reverseGeocode = (pos: { lat: number; lng: number }) => {
    const gmaps = typeof window !== 'undefined' ? (window as any).google?.maps : null;
    if (!gmaps?.Geocoder) {
      onCenterChange(pos);
      return;
    }
    const geocoder = new gmaps.Geocoder();
    geocoder.geocode({ location: pos }, (results: any, status: string) => {
      if (status === 'OK' && results && results[0]) {
        const locality = results[0].address_components?.find((c: any) =>
          c.types?.includes('locality') || c.types?.includes('sublocality')
        )?.long_name;
        onCenterChange(pos, locality || results[0].formatted_address);
      } else {
        onCenterChange(pos);
      }
    });
  };

  // 3. Actualizar círculo cuando cambia el radio o el centro
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusMeters);
      circleRef.current.setCenter(center);
    }
    if (centerMarkerRef.current) {
      centerMarkerRef.current.setPosition(center);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(center);
    }
  }, [radiusMeters, center]);

  // 4. Graficar los pines de los comercios encontrados
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const gmaps = typeof window !== 'undefined' ? (window as any).google?.maps : null;
    if (!gmaps) return;

    // Limpiar pines anteriores
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new gmaps.LatLngBounds();
    bounds.extend(center);

    prospects.forEach((prospect) => {
      if (!prospect.lat || !prospect.lng) return;

      const pos = { lat: prospect.lat, lng: prospect.lng };
      bounds.extend(pos);

      const hasNoWeb = !prospect.digitalHealth.hasWebsite;
      const markerColor = hasNoWeb ? '#ef4444' : '#10b981';

      const marker = new gmaps.Marker({
        position: pos,
        map: mapInstanceRef.current!,
        title: prospect.name,
        animation: gmaps.Animation.DROP,
        icon: {
          path: gmaps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: markerColor,
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      });

      marker.addListener('click', () => {
        onSelectProspect(prospect);

        if (infoWindowRef.current && mapInstanceRef.current) {
          const contentString = `
            <div style="background:#0e0e14; color:#fff; padding:12px; border-radius:12px; font-family:sans-serif; max-width:280px; box-shadow:0 10px 25px rgba(0,0,0,0.5); border:1px solid rgba(168,85,247,0.3);">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                <span style="font-size:10px; font-weight:700; color:#c084fc; text-transform:uppercase;">${prospect.category}</span>
                <span style="font-size:11px; color:#fbbf24; font-weight:bold;">★ ${prospect.rating || 'N/A'}</span>
              </div>
              <h4 style="font-size:14px; font-weight:bold; margin:0 0 4px 0; color:#ffffff;">${prospect.name}</h4>
              <p style="font-size:11px; color:#94a3b8; margin:0 0 8px 0; line-height:1.3;">${prospect.address}</p>
              
              <div style="padding:6px 8px; border-radius:8px; background:${hasNoWeb ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}; border:1px solid ${hasNoWeb ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}; margin-bottom:8px;">
                <div style="font-size:11px; font-weight:bold; color:${hasNoWeb ? '#f87171' : '#34d399'};">
                  ${hasNoWeb ? '⚠️ Sin Sitio Web Oficial' : '🌐 Sitio Web Operativo'}
                </div>
                <div style="font-size:10px; color:#cbd5e1; margin-top:2px;">
                  ${prospect.digitalHealth.diagnosis || 'Oportunidad de digitalización'}
                </div>
              </div>

              <div style="font-size:11px; color:#c084fc; font-weight:600; margin-bottom:8px;">
                Solución: ${prospect.digitalHealth.suggestedSolution}
              </div>

              <button onclick="window.__creappOpenDossier && window.__creappOpenDossier('${prospect.id}')" style="width:100%; padding:7px 10px; background:linear-gradient(to right, #9333ea, #6366f1); color:#ffffff; font-weight:bold; border-radius:8px; border:none; cursor:pointer; font-size:11px; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 4px 12px rgba(147,51,234,0.3);">
                🔍 Abrir Ficha 360° & Guion de Venta
              </button>
            </div>
          `;
          (window as any).__creappOpenDossier = (id: string) => {
            const found = prospects.find((p) => p.id === id);
            if (found && onOpenDossier) {
              onOpenDossier(found);
            }
          };

          infoWindowRef.current.setContent(contentString);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      markersRef.current.push(marker);
    });

    if (prospects.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    }
  }, [prospects, mapLoaded]);

  // Centrar y rebotar marker cuando cambia selectedProspect
  useEffect(() => {
    if (!selectedProspect?.lat || !selectedProspect?.lng || !mapInstanceRef.current) return;
    mapInstanceRef.current.panTo({ lat: selectedProspect.lat, lng: selectedProspect.lng });
    mapInstanceRef.current.setZoom(16);
  }, [selectedProspect]);

  // Buscar dirección con Geocoder
  const handleAddressSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const gmaps = typeof window !== 'undefined' ? (window as any).google?.maps : null;
    if (!addressSearch.trim() || !gmaps?.Geocoder) return;

    setIsSearchingAddress(true);
    const geocoder = new gmaps.Geocoder();
    geocoder.geocode({ address: addressSearch }, (results: any, status: string) => {
      setIsSearchingAddress(false);
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        const newPos = { lat: loc.lat(), lng: loc.lng() };
        mapInstanceRef.current?.panTo(newPos);
        mapInstanceRef.current?.setZoom(getZoomForRadius(radiusMeters));
        centerMarkerRef.current?.setPosition(newPos);
        circleRef.current?.setCenter(newPos);
        
        const locality = results[0].address_components?.find((c: any) =>
          c.types?.includes('locality') || c.types?.includes('sublocality')
        )?.long_name;
        onCenterChange(newPos, locality || addressSearch);
      }
    });
  };

  // Geolocalización del navegador
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          mapInstanceRef.current?.panTo(coords);
          centerMarkerRef.current?.setPosition(coords);
          circleRef.current?.setCenter(coords);
          reverseGeocode(coords);
        },
        () => {
          alert('No se pudo obtener la geolocalización de tu navegador.');
        }
      );
    }
  };

  function getZoomForRadius(radius: number): number {
    if (radius <= 800) return 15;
    if (radius <= 2000) return 14;
    if (radius <= 4000) return 13;
    if (radius <= 8000) return 12;
    if (radius <= 15000) return 11;
    return 10;
  }

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border border-purple-500/20 bg-[#0c0c12] shadow-2xl transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'w-full h-[450px]'
      }`}
    >
      {/* MAP CANVAS */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {loadError && !mapLoaded && (
        <div className="absolute inset-0 bg-[#0c0c12]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <AlertTriangle size={32} className="text-amber-400 mb-2" />
          <h3 className="text-base font-bold text-white mb-1">Cargando Google Maps</h3>
          <p className="text-xs text-zinc-400 max-w-md mb-3">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={12} />
            <span>Recargar página</span>
          </button>
        </div>
      )}

      {/* TOP FLOATING BAR: ADDRESS GEOCODER + MY LOCATION */}
      <div className="absolute top-4 left-4 right-4 flex flex-col sm:flex-row items-center gap-2 z-10 pointer-events-none">
        <form
          onSubmit={handleAddressSearch}
          className="flex-1 w-full flex items-center gap-2 bg-[#0e0e14]/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 shadow-xl pointer-events-auto"
        >
          <MapPin size={16} className="text-purple-400 shrink-0" />
          <input
            type="text"
            value={addressSearch}
            onChange={(e) => setAddressSearch(e.target.value)}
            placeholder="Buscar barrio o zona (ej: Carapachay, Palermo, Centro Córdoba)..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSearchingAddress}
            className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
          >
            {isSearchingAddress ? 'Centrando...' : 'Ir a zona'}
          </button>
        </form>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Botón Mi Ubicación */}
          <button
            onClick={handleCurrentLocation}
            title="Centrar en mi ubicación actual"
            className="p-2.5 rounded-2xl bg-[#0e0e14]/90 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white hover:bg-purple-600/30 transition-all shadow-xl"
          >
            <Navigation size={16} />
          </button>

          {/* Botón Pantalla Completa */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Reducir' : 'Expandir mapa'}
            className="p-2.5 rounded-2xl bg-[#0e0e14]/90 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white hover:bg-purple-600/30 transition-all shadow-xl"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* BOTTOM FLOATING CONTROLS: RADIUS SLIDER & PRESETS */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
        <div className="bg-[#0e0e14]/95 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto">
          {/* Radio label and value */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Crosshair size={16} />
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-medium">Radio de Cobertura</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                <span>{(radiusMeters / 1000).toFixed(1)} km</span>
                <span className="text-[10px] text-purple-400 font-sans font-normal">
                  ({radiusMeters} metros)
                </span>
              </div>
            </div>
          </div>

          {/* Slider */}
          <div className="flex-1 w-full max-w-sm flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono">500m</span>
            <input
              type="range"
              min={500}
              max={15000}
              step={250}
              value={radiusMeters}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
            <span className="text-[10px] text-zinc-500 font-mono">15km</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {[
              { label: '500m', val: 500 },
              { label: '1 km', val: 1000 },
              { label: '2.5 km', val: 2500 },
              { label: '5 km', val: 5000 },
              { label: '10 km', val: 10000 },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => onRadiusChange(p.val)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-medium transition-all ${
                  radiusMeters === p.val
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAP RADAR LEGEND */}
      <div className="absolute top-18 left-4 z-10 pointer-events-none hidden sm:flex items-center gap-2 bg-[#0e0e14]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 text-[10px] text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Sin Web
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Con Web
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-400" /> Centro Radar
        </span>
      </div>
    </div>
  );
};
