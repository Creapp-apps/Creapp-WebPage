import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Crosshair,
  Maximize2,
  Minimize2,
  Navigation,
  AlertTriangle,
  RefreshCw,
  Route,
  Car,
  Bike,
  Footprints,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  RotateCcw,
  Sparkles,
  PhoneCall,
  Check,
} from 'lucide-react';
import { ScrapedProspect } from '@/lib/scraperService';
import {
  buildGoogleMapsMultiStopUrl,
  optimizeStopsByProximity,
  calculateDistanceKm,
  getStoredVisitRoute,
  saveStoredVisitRoute,
  RouteStop,
  VisitRoutePlan,
} from '@/lib/routePlannerService';

interface GoogleRadarMapProps {
  apiKey: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  prospects: ScrapedProspect[];
  selectedProspect?: ScrapedProspect | null;
  importedIds?: Set<string>;
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
  importedIds,
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
  const directionsRendererRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addressSearch, setAddressSearch] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // MODO DE MAPA: 'radar' (Radial 360°) vs 'route' (Ruta de Visitas A -> B)
  const [mapMode, setMapMode] = useState<'radar' | 'route'>('radar');

  // CONFIGURACIÓN DE RUTA DE VISITAS
  const [originAddress, setOriginAddress] = useState<string>('Punto de Partida');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number }>(center);
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number }>(center);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(true);
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'WALKING' | 'BICYCLING'>('DRIVING');

  // ITINERARIO ACTIVO
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [totalRouteDistanceKm, setTotalRouteDistanceKm] = useState<number>(0);
  const [totalRouteDurationMin, setTotalRouteDurationMin] = useState<number>(0);
  const [googleNavUrl, setGoogleNavUrl] = useState<string>('');
  const [isItineraryOpen, setIsItineraryOpen] = useState(true);

  // Cargar ruta guardada previamente en localStorage si existe
  useEffect(() => {
    const saved = getStoredVisitRoute();
    if (saved) {
      setOriginAddress(saved.originAddress || 'Punto de Partida');
      setOriginCoords(saved.originCoords || center);
      setDestinationAddress(saved.destinationAddress || '');
      setDestinationCoords(saved.destinationCoords || center);
      setTravelMode(saved.travelMode || 'DRIVING');
      setRouteStops(saved.stops || []);
      setTotalRouteDistanceKm(saved.totalDistanceKm || 0);
      setTotalRouteDurationMin(saved.totalDurationMin || 0);
      setGoogleNavUrl(saved.googleMapsNavigationUrl || '');
    }
  }, []);

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

  // 2. Inicializar instancia de Google Map
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current) return;
    const gmaps = typeof window !== 'undefined' ? (window as any).google?.maps : null;
    if (!gmaps) return;

    try {
      const map = new gmaps.Map(mapContainerRef.current, {
        center,
        zoom: getZoomForRadius(radiusMeters),
        styles: DARK_MAP_STYLE,
        disableDefaultUI: false,
        mapTypeControl: false,
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

      // DirectionsRenderer para el trazado de la ruta
      const directionsRenderer = new gmaps.DirectionsRenderer({
        map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#c084fc',
          strokeWeight: 5,
          strokeOpacity: 0.85,
        },
      });

      centerMarker.addListener('dragend', (e: any) => {
        if (e.latLng) {
          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          circle.setCenter(newPos);
          reverseGeocode(newPos);
        }
      });

      map.addListener('click', (e: any) => {
        if (e.latLng && mapMode === 'radar') {
          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          centerMarker.setPosition(newPos);
          circle.setCenter(newPos);
          reverseGeocode(newPos);
        }
      });

      mapInstanceRef.current = map;
      centerMarkerRef.current = centerMarker;
      circleRef.current = circle;
      directionsRendererRef.current = directionsRenderer;
      infoWindowRef.current = new gmaps.InfoWindow();
    } catch (e: any) {
      setLoadError(e.message || 'Error inicializando el mapa');
    }
  }, [mapLoaded]);

  // Alternar visibilidad de capas según el modo activo
  useEffect(() => {
    if (!circleRef.current || !centerMarkerRef.current) return;
    if (mapMode === 'route') {
      circleRef.current.setVisible(false);
      centerMarkerRef.current.setVisible(false);
    } else {
      circleRef.current.setVisible(true);
      centerMarkerRef.current.setVisible(true);
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] });
      }
    }
  }, [mapMode]);

  const reverseGeocode = (pos: { lat: number; lng: number }, target: 'center' | 'origin' | 'dest' = 'center') => {
    const gmaps = typeof window !== 'undefined' ? (window as any).google?.maps : null;
    if (!gmaps?.Geocoder) {
      if (target === 'center') onCenterChange(pos);
      return;
    }
    const geocoder = new gmaps.Geocoder();
    geocoder.geocode({ location: pos }, (results: any, status: string) => {
      if (status === 'OK' && results && results[0]) {
        const addr = results[0].formatted_address;
        const locality = results[0].address_components?.find((c: any) =>
          c.types?.includes('locality') || c.types?.includes('sublocality')
        )?.long_name;

        if (target === 'center') {
          onCenterChange(pos, locality || addr);
        } else if (target === 'origin') {
          setOriginAddress(addr);
        } else if (target === 'dest') {
          setDestinationAddress(addr);
        }
      } else {
        if (target === 'center') onCenterChange(pos);
      }
    });
  };

  // 3. Actualizar círculo cuando cambia el radio o el centro en modo Radar
  useEffect(() => {
    if (mapMode !== 'radar') return;
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
  }, [radiusMeters, center, mapMode]);

  // 4. Graficar los pines de los comercios encontrados en modo Radar
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || mapMode !== 'radar') return;
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

      const isImported = importedIds ? importedIds.has(prospect.id) : false;
      const hasNoWeb = !prospect.digitalHealth.hasWebsite;

      const markerColor = isImported ? '#a855f7' : hasNoWeb ? '#ef4444' : '#10b981';
      const markerScale = isImported ? 6.5 : 5;
      const markerStrokeWeight = isImported ? 2.5 : 1.5;

      const marker = new gmaps.Marker({
        position: pos,
        map: mapInstanceRef.current!,
        title: `${prospect.name}${isImported ? ' (En Pipeline CRM)' : ''}`,
        animation: gmaps.Animation.DROP,
        zIndex: isImported ? 999 : 1,
        icon: {
          path: gmaps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: markerScale,
          fillColor: markerColor,
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWeight: markerStrokeWeight,
        },
      });

      marker.addListener('click', () => {
        onSelectProspect(prospect);

        if (infoWindowRef.current && mapInstanceRef.current) {
          const contentString = `
            <div style="background:#0e0e14; color:#fff; padding:12px; border-radius:12px; font-family:sans-serif; max-width:280px; box-shadow:0 10px 25px rgba(0,0,0,0.5); border:1px solid ${isImported ? 'rgba(168,85,247,0.7)' : 'rgba(168,85,247,0.3)'};">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                <span style="font-size:10px; font-weight:700; color:#c084fc; text-transform:uppercase;">${prospect.category}</span>
                <span style="font-size:11px; color:#fbbf24; font-weight:bold;">★ ${prospect.rating || 'N/A'}</span>
              </div>
              
              ${
                isImported
                  ? `<div style="display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:bold; color:#e9d5ff; background:rgba(168,85,247,0.3); padding:3px 8px; border-radius:6px; border:1px solid rgba(168,85,247,0.6); margin-bottom:6px;">
                      <span>✓ EN PIPELINE CRM</span>
                    </div>`
                  : ''
              }

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
  }, [prospects, mapLoaded, importedIds, mapMode]);

  // 5. Centrar y rebotar marker cuando cambia selectedProspect
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
  const handleCurrentLocation = (target: 'center' | 'origin' | 'dest' = 'center') => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (target === 'origin') {
            setOriginCoords(coords);
            reverseGeocode(coords, 'origin');
          } else if (target === 'dest') {
            setIsRoundTrip(false);
            setDestinationCoords(coords);
            reverseGeocode(coords, 'dest');
          } else {
            mapInstanceRef.current?.panTo(coords);
            centerMarkerRef.current?.setPosition(coords);
            circleRef.current?.setCenter(coords);
            reverseGeocode(coords, 'center');
          }
        },
        () => {
          alert('No se pudo obtener la geolocalización de tu navegador.');
        }
      );
    }
  };

  const geocodeAddressToCoords = (addressText: string, target: 'origin' | 'dest') => {
    const gmaps = typeof window !== 'undefined' ? (window as any).google?.maps : null;
    if (!addressText.trim() || !gmaps?.Geocoder) return;

    const geocoder = new gmaps.Geocoder();
    geocoder.geocode({ address: addressText }, (results: any, status: string) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        const newPos = { lat: loc.lat(), lng: loc.lng() };
        if (target === 'origin') {
          setOriginCoords(newPos);
        } else {
          setDestinationCoords(newPos);
        }
      }
    });
  };

  // ==========================================
  // TRAZADO Y OPTIMIZACIÓN DE RUTA DE VISITAS
  // ==========================================
  const handleCalculateRoute = () => {
    const gmaps = typeof window !== 'undefined' ? (window as any).google?.maps : null;
    if (!gmaps) return;

    setIsCalculatingRoute(true);

    const validProspects = prospects
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
      .slice(0, 12); // Limitar a las 12 paradas clave para evitar saturación de waypoints

    if (validProspects.length === 0) {
      alert('No hay comercios con ubicación detectada en esta zona para trazar la ruta.');
      setIsCalculatingRoute(false);
      return;
    }

    const dest = isRoundTrip ? originCoords : destinationCoords;

    // 1. Intentar con Google Maps DirectionsService
    if (gmaps.DirectionsService && directionsRendererRef.current) {
      const directionsService = new gmaps.DirectionsService();

      const waypoints = validProspects.map((p) => ({
        location: new gmaps.LatLng(p.lat!, p.lng!),
        stopover: true,
      }));

      const gmapsTravelMode =
        travelMode === 'WALKING'
          ? gmaps.TravelMode.WALKING
          : travelMode === 'BICYCLING'
          ? gmaps.TravelMode.BICYCLING
          : gmaps.TravelMode.DRIVING;

      directionsService.route(
        {
          origin: new gmaps.LatLng(originCoords.lat, originCoords.lng),
          destination: new gmaps.LatLng(dest.lat, dest.lng),
          waypoints,
          optimizeWaypoints: true,
          travelMode: gmapsTravelMode,
        },
        (result: any, status: string) => {
          setIsCalculatingRoute(false);

          if (status === 'OK' && result) {
            directionsRendererRef.current.setDirections(result);

            const route = result.routes[0];
            let totalDistMeters = 0;
            let totalDurSeconds = 0;

            route.legs.forEach((leg: any) => {
              totalDistMeters += leg.distance.value;
              totalDurSeconds += leg.duration.value;
            });

            const totalDistKm = Number((totalDistMeters / 1000).toFixed(1));
            const totalDurMin = Math.round(totalDurSeconds / 60);
            setTotalRouteDistanceKm(totalDistKm);
            setTotalRouteDurationMin(totalDurMin);

            // Reordenar las paradas de acuerdo con el waypoint_order devuelto por Google
            const waypointOrder: number[] = route.waypoint_order || [];
            const orderedStops: RouteStop[] = waypointOrder.map((originalIdx, orderIdx) => {
              const prospect = validProspects[originalIdx];
              const leg = route.legs[orderIdx];
              return {
                prospectId: prospect.id,
                order: orderIdx + 1,
                prospect,
                distanceFromPreviousKm: leg ? Number((leg.distance.value / 1000).toFixed(1)) : 0.5,
                durationFromPreviousMin: leg ? Math.round(leg.duration.value / 60) : 4,
                visitedStatus: 'pending',
              };
            });

            setRouteStops(orderedStops);

            const navUrl = buildGoogleMapsMultiStopUrl(
              originCoords,
              dest,
              orderedStops.map((s) => ({ lat: s.prospect.lat!, lng: s.prospect.lng! })),
              travelMode
            );
            setGoogleNavUrl(navUrl);

            // Guardar en localStorage
            const plan: VisitRoutePlan = {
              id: `route-${Date.now()}`,
              createdAt: new Date().toISOString(),
              name: `Ruta ${prospects[0]?.city || 'Comercial'} (${orderedStops.length} paradas)`,
              originAddress,
              originCoords,
              destinationAddress: isRoundTrip ? originAddress : destinationAddress,
              destinationCoords: dest,
              travelMode,
              stops: orderedStops,
              totalDistanceKm: totalDistKm,
              totalDurationMin: totalDurMin,
              googleMapsNavigationUrl: navUrl,
            };
            saveStoredVisitRoute(plan);
          } else {
            console.warn("DirectionsService devolvió status:", status, "usando algoritmo de cercanía local");
            runFallbackProximityRouting(validProspects, dest);
          }
        }
      );
    } else {
      runFallbackProximityRouting(validProspects, dest);
      setIsCalculatingRoute(false);
    }
  };

  const runFallbackProximityRouting = (
    validProspects: ScrapedProspect[],
    dest: { lat: number; lng: number }
  ) => {
    const stops = optimizeStopsByProximity(originCoords, dest, validProspects, travelMode);
    setRouteStops(stops);

    let distAcc = 0;
    let durAcc = 0;
    stops.forEach((s) => {
      distAcc += s.distanceFromPreviousKm || 0;
      durAcc += s.durationFromPreviousMin || 0;
    });

    setTotalRouteDistanceKm(Number(distAcc.toFixed(1)));
    setTotalRouteDurationMin(durAcc);

    const navUrl = buildGoogleMapsMultiStopUrl(
      originCoords,
      dest,
      stops.map((s) => ({ lat: s.prospect.lat!, lng: s.prospect.lng! })),
      travelMode
    );
    setGoogleNavUrl(navUrl);
  };

  const handleUpdateStopStatus = (prospectId: string, status: RouteStop['visitedStatus']) => {
    setRouteStops((prev) => {
      const updated = prev.map((s) => (s.prospectId === prospectId ? { ...s, visitedStatus: status } : s));
      const saved = getStoredVisitRoute();
      if (saved) {
        saved.stops = updated;
        saveStoredVisitRoute(saved);
      }
      return updated;
    });
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
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'w-full min-h-[520px]'
      } flex flex-col`}
    >
      {/* HEADER DE MODO: RADAR vs RUTA DE VISITAS */}
      <div className="p-3 bg-[#0e0e18] border-b border-white/10 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/5">
          <button
            type="button"
            onClick={() => setMapMode('radar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mapMode === 'radar'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Crosshair size={13} />
            <span>🎯 Radar Radial (360°)</span>
          </button>
          <button
            type="button"
            onClick={() => setMapMode('route')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mapMode === 'route'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Route size={13} />
            <span>📍 Ruta de Visitas (A ➔ B)</span>
            {routeStops.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                {routeStops.length}
              </span>
            )}
          </button>
        </div>

        {/* ACCIONES TOP RIGHT */}
        <div className="flex items-center gap-2">
          {mapMode === 'route' && routeStops.length > 0 && (
            <button
              type="button"
              onClick={() => setIsItineraryOpen(!isItineraryOpen)}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>{isItineraryOpen ? 'Ocultar Itinerario' : 'Ver Itinerario'}</span>
              {isItineraryOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Reducir' : 'Expandir mapa'}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL: MAPA + PANELES */}
      <div className="relative flex-1 w-full min-h-[380px]">
        {/* MAP CANVAS */}
        <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

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

        {/* ================================================= */}
        {/* PANEL MODO 1: RADAR (BUSCADOR DE CALLE / ZONA)    */}
        {/* ================================================= */}
        {mapMode === 'radar' && (
          <>
            <div className="absolute top-4 left-4 right-4 flex items-center gap-2 z-10 pointer-events-none">
              <form
                onSubmit={handleAddressSearch}
                className="flex-1 flex items-center gap-2 bg-[#0e0e14]/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 shadow-xl pointer-events-auto"
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

              <button
                onClick={() => handleCurrentLocation('center')}
                title="Centrar en mi ubicación actual"
                className="p-2.5 rounded-2xl bg-[#0e0e14]/90 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white hover:bg-purple-600/30 transition-all shadow-xl pointer-events-auto"
              >
                <Navigation size={16} />
              </button>
            </div>

            {/* BARRA INFERIOR DEL RADAR: SLIDER DE COBERTURA */}
            <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
              <div className="bg-[#0e0e14]/95 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto">
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
          </>
        )}

        {/* ================================================= */}
        {/* PANEL MODO 2: RUTA DE VISITAS (A ➔ B)             */}
        {/* ================================================= */}
        {mapMode === 'route' && (
          <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none space-y-2">
            <div className="bg-[#0e0e14]/95 backdrop-blur-md p-3.5 rounded-2xl border border-purple-500/30 shadow-2xl pointer-events-auto space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* PUNTO A (ORIGEN) */}
                <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-xl border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                    A
                  </div>
                  <input
                    type="text"
                    value={originAddress}
                    onChange={(e) => setOriginAddress(e.target.value)}
                    onBlur={() => geocodeAddressToCoords(originAddress, 'origin')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') geocodeAddressToCoords(originAddress, 'origin');
                    }}
                    placeholder="Dirección de Partida..."
                    className="flex-1 bg-transparent text-white placeholder:text-zinc-500 focus:outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleCurrentLocation('origin')}
                    title="Usar mi ubicación GPS actual para el Punto A"
                    className="p-1 rounded text-zinc-400 hover:text-emerald-400 transition-colors"
                  >
                    <Navigation size={13} />
                  </button>
                </div>

                {/* PUNTO B (DESTINO) */}
                <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-xl border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                    B
                  </div>
                  <input
                    type="text"
                    value={isRoundTrip ? 'Circuito cerrado (Regreso al Punto A)' : destinationAddress}
                    onFocus={() => {
                      if (isRoundTrip) {
                        setIsRoundTrip(false);
                        setDestinationAddress('');
                      }
                    }}
                    onChange={(e) => {
                      setIsRoundTrip(false);
                      setDestinationAddress(e.target.value);
                    }}
                    onBlur={() => {
                      if (destinationAddress.trim() && !isRoundTrip) {
                        geocodeAddressToCoords(destinationAddress, 'dest');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && destinationAddress.trim()) {
                        geocodeAddressToCoords(destinationAddress, 'dest');
                      }
                    }}
                    placeholder="Escribe la dirección de llegada..."
                    className={`flex-1 bg-transparent text-xs focus:outline-none transition-colors ${
                      isRoundTrip ? 'text-purple-300 font-medium' : 'text-white placeholder:text-zinc-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleCurrentLocation('dest')}
                    title="Usar mi ubicación GPS para el Punto B"
                    className="p-1 rounded text-zinc-400 hover:text-purple-400 transition-colors"
                  >
                    <Navigation size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isRoundTrip;
                      setIsRoundTrip(next);
                      if (next) {
                        setDestinationAddress(originAddress || 'Regreso al Punto A');
                        setDestinationCoords(originCoords);
                      } else {
                        setDestinationAddress('');
                      }
                    }}
                    title={isRoundTrip ? 'Click para escribir un destino B distinto' : 'Hacer circuito de regreso a A'}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all shrink-0 ${
                      isRoundTrip
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    <RotateCcw size={11} />
                    <span>{isRoundTrip ? 'Circuito a A' : 'Volver a A'}</span>
                  </button>
                </div>
              </div>

              {/* CONTROLES DE TRANSPORTE Y ACCIÓN DE CÁLCULO */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-zinc-400 mr-1">Transporte:</span>
                  <button
                    type="button"
                    onClick={() => setTravelMode('DRIVING')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      travelMode === 'DRIVING'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Car size={13} />
                    <span>Auto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelMode('BICYCLING')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      travelMode === 'BICYCLING'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Bike size={13} />
                    <span>En bicicleta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelMode('WALKING')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      travelMode === 'WALKING'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Footprints size={13} />
                    <span>A pie</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCalculateRoute}
                    disabled={isCalculatingRoute || prospects.length === 0}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                  >
                    <Sparkles size={13} />
                    <span>
                      {isCalculatingRoute
                        ? 'Optimizando Recorrido...'
                        : `Trazar Ruta con ${Math.min(prospects.length, 12)} Leads`}
                    </span>
                  </button>

                  {googleNavUrl && (
                    <a
                      href={googleNavUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
                    >
                      <ExternalLink size={13} />
                      <span className="hidden sm:inline">Abrir en Google Maps Móvil</span>
                      <span className="sm:hidden">GPS Móvil</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* DRAWER / PANEL INFERIOR: ITINERARIO DE VISITAS    */}
      {/* ================================================= */}
      {mapMode === 'route' && routeStops.length > 0 && isItineraryOpen && (
        <div className="bg-[#0b0b12] border-t border-purple-500/20 p-4 space-y-3 shrink-0 max-h-[260px] overflow-y-auto">
          {/* STATS DEL RECORRIDO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-zinc-400 flex items-center gap-1">
                <Route size={14} className="text-purple-400" />
                <strong className="text-white">{totalRouteDistanceKm} km</strong> totales
              </span>
              <span className="text-zinc-400 flex items-center gap-1">
                <Clock size={14} className="text-indigo-400" />
                <strong className="text-white">~{totalRouteDurationMin} min</strong> de traslado
              </span>
              <span className="text-zinc-400 flex items-center gap-1">
                <MapPin size={14} className="text-emerald-400" />
                <strong className="text-white">{routeStops.length} locales</strong> en ruta
              </span>
            </div>

            {googleNavUrl && (
              <a
                href={googleNavUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <span>Iniciar Navegación GPS Paso a Paso</span>
                <ArrowRight size={12} />
              </a>
            )}
          </div>

          {/* LISTADO DE PARADAS NUMERADAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {routeStops.map((stop) => {
              const p = stop.prospect;
              const hasNoWeb = !p.digitalHealth.hasWebsite;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2 ${
                    stop.visitedStatus === 'visited'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : stop.visitedStatus === 'proposal_delivered'
                      ? 'bg-blue-950/20 border-blue-500/30'
                      : stop.visitedStatus === 'rejected' || stop.visitedStatus === 'absent'
                      ? 'bg-rose-950/10 border-rose-500/20 opacity-75'
                      : 'bg-[#12121e] border-white/5 hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-600 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 shadow">
                        {stop.order}
                      </div>
                      <div>
                        <h5 className="font-bold text-white truncate max-w-[170px]">{p.name}</h5>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[170px]">{p.address}</p>
                      </div>
                    </div>

                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                      hasNoWeb ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {hasNoWeb ? 'Sin Web' : 'Con Web'}
                    </span>
                  </div>

                  {/* CONTROL DE ESTADO DE VISITA & BOTONES */}
                  <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/5">
                    <select
                      value={stop.visitedStatus}
                      onChange={(e) => handleUpdateStopStatus(p.id, e.target.value as any)}
                      className="bg-black/60 text-zinc-300 text-[10px] rounded-lg px-2 py-1 border border-white/10 focus:outline-none"
                    >
                      <option value="pending">⏳ Pendiente</option>
                      <option value="visited">✅ Visitado</option>
                      <option value="proposal_delivered">📄 Dejé Propuesta</option>
                      <option value="absent">🚪 Cerrado / Ausente</option>
                      <option value="rejected">❌ No Interesado</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenPitch(p)}
                        title="Ver guion presencial para mostrador"
                        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 text-[10px] font-semibold transition-colors"
                      >
                        Speech
                      </button>
                      {onOpenDossier && (
                        <button
                          type="button"
                          onClick={() => onOpenDossier(p)}
                          title="Abrir Dossier 360 & Auditoría"
                          className="p-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[10px] font-semibold transition-colors"
                        >
                          Ficha
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
