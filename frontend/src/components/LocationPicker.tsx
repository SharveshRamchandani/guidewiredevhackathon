import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/hooks/useLocation';
import { workerApi } from '@/lib/api';
import { useWorkerAuthStore } from '@/stores/workerAuthStore';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, X } from 'lucide-react';


interface Zone {
  id: string;
  name: string;
  zone_number: number;
  risk_level: string;
}

interface LocationPickerProps {
  onLocationSaved: (city: string, zoneId: string, lat: number, lng: number) => void;
  compact?: boolean;
}

interface LocationData {
  data: any | null;
  error: string | null;
}

const LocationPicker = ({ onLocationSaved, compact = false }: LocationPickerProps) => {
  const [open, setOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const { detect, loading, error: detectError, data } = useLocation();
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedAvailableCity, setSelectedAvailableCity] = useState('');
  const { token } = useWorkerAuthStore();
  const { toast } = useToast();

  const handleDetect = async () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", description: "Please enable location services", variant: "destructive" });
      return;
    }
    await detect();
  };

  const handleConfirm = async () => {
    if (!selectedZoneId || !data || !token) return;

    try {
      await workerApi.updateLocation(data.city, selectedZoneId, token);
      toast({ title: `Location updated to ${data.city}`, description: `Zone ${data.zones.find(z => z.id === selectedZoneId)?.name}` });
      onLocationSaved(data.city, selectedZoneId, data.lat, data.lng);
      setOpen(false);
    } catch (error) {
      toast({ title: "Update failed", description: "Please try again", variant: "destructive" });
    }
  };

  // Auto-select first zone if only one
  useEffect(() => {
    if (data?.zones.length === 1) {
      setSelectedZoneId(data.zones[0].id);
    }
  }, [data]);

  const riskLabel = (zoneNumber: number) => {
    const labels = ['Low Risk', 'Moderate Risk', 'High Risk', 'Very High Risk'];
    return labels[zoneNumber - 1] || 'Unknown';
  };

  const riskVariant = (zoneNumber: number) => {
    const variants = ['default', 'secondary', 'destructive', 'outline'] as const;
    return variants[Math.min(zoneNumber - 1, 3)];
  };

  return (
    <>
      <Button 
        onClick={() => setOpen(true)} 
        variant={compact ? "outline" : "default"}
        size={compact ? "sm" : "default"}
        className={compact ? "w-full" : ""}
      >
        <MapPin className="h-4 w-4 mr-2" />
        {compact ? "Set Location" : "📍 Use My Location"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📍 Set Your Location
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-8 w-8 p-0"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              We'll detect your location and match it to the nearest GigShield zone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4 py-4">
            {!data && !detectError && (
              <div className="flex flex-col items-center space-y-4 p-8">
                <Button onClick={handleDetect} disabled={loading} className="w-full max-w-sm">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    'Detect My Location'
                  )}
                </Button>
                {loading && <div className="text-sm text-muted-foreground">Allow location access...</div>}
              </div>
            )}

            {detectError && (
              <div className="p-6 bg-destructive/5 border border-destructive/20 rounded-lg text-destructive-foreground">
                <div className="font-medium">Detection failed</div>
                <div className="text-sm">{detectError}</div>
                <Button variant="outline" onClick={handleDetect} className="mt-3 w-full">
                  Try Again
                </Button>
              </div>
            )}

            {data && (
              <>
                <div className="text-center space-y-1">
                  <div className="text-lg font-semibold">{data.locality}, {data.city}</div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center">
                    {data.lat.toFixed(4)}, {data.lng.toFixed(4)}
                  </div>
                </div>

                {/* OpenStreetMap iframe */}
                <div className="h-[300px] rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="100%"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.lng-0.01}%2C${data.lat-0.01}%2C${data.lng+0.01}%2C${data.lat+0.01}&layer=mapnik&marker=${data.lat}%2C${data.lng}`}
                    style={{border: 0}}
                  />
                </div>

                {/* Zone Selector */}
                {(data?.zones?.length ?? 0) > 0 ? (
                  <div>
                    <div className="font-medium mb-2">Select Zone</div>
                    <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose your zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.zones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            <div className="flex items-center justify-between">
                              <span>{zone.name} (Zone {zone.zone_number})</span>
                              <Badge variant={riskVariant(zone.zone_number)}>
                                {riskLabel(zone.zone_number)}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Zone Info Card */}
                    {selectedZoneId && (
                      <Card className="mt-3">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="font-medium">
                              {(data?.zones ?? []).find(z => z.id === selectedZoneId)?.name}
                            </div>
                            <Badge variant={riskVariant((data?.zones ?? []).find(z => z.id === selectedZoneId)?.zone_number ?? 1)}>
                              {riskLabel((data?.zones ?? []).find(z => z.id === selectedZoneId)?.zone_number ?? 1)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    No zones found for this city
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedZoneId || !data || loading}
            >
              Confirm Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LocationPicker;

