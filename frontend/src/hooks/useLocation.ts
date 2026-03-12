import { useState, useCallback } from 'react';
import { workerApi } from '@/lib/api';
import { useWorkerAuthStore } from '@/stores/workerAuthStore';

interface LocationResult {
  city: string;
  locality: string;
  lat: number;
  lng: number;
  principalSubdivision: string;
  zones: Array<{
    id: string;
    name: string;
    zone_number: number;
    risk_level: string;
  }>;
}

interface UseLocationReturn {
  detect: () => Promise<void>;
  loading: boolean;
  error: string | null;
  data: LocationResult | null;
}

export const useLocation = (): UseLocationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LocationResult | null>(null);

  const { token } = useWorkerAuthStore();

  const detect = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // 1. Browser Geolocation API
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // 2. BigDataCloud Reverse Geocode (no key)
      const geoResponse = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const geoData = await geoResponse.json();

      if (!geoData.city) {
        throw new Error('Could not determine city from coordinates');
      }

      // Normalize city: lowercase trim
      const normalizedCity = geoData.city.trim().toLowerCase();

      // 3. Call backend zones API
      const zonesResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/worker/zones?city=${encodeURIComponent(normalizedCity)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const zonesData = await zonesResponse.json();

      if (!zonesData.success) {
        throw new Error(zonesData.message || 'City not supported');
      }

      // Update LocationResult to handle remapped/detectedAs
      setData({
        city: zonesData.city,
        locality: geoData.locality || geoData.city,
        lat,
        lng,
        principalSubdivision: geoData.principalSubdivision || '',
        zones: zonesData.zones || [],
        detectedAs: zonesData.detectedAs,
        remapped: zonesData.remapped
      } as any);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Location detection failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { detect, loading, error, data };
};

