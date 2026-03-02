import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, MapPin, Wrench, Clock, Phone, Loader2,
  CheckCircle2, Circle, AlertCircle, Navigation, User,
} from 'lucide-react';
import { requestsService } from '@/config/api';
import { toast } from 'sonner';
import { reverseGeocode, isCoordString, parseCoordString } from '@/utils/geocode';
import { useRequests, Request } from '@/contexts/RequestContext';
import { cn } from '@/lib/utils';

// ─── Status timeline config ─────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'pending',   label: 'Request Sent',        desc: 'Looking for a nearby mechanic' },
  { key: 'accepted',  label: 'Mechanic Accepted',    desc: 'A mechanic is preparing to come' },
  { key: 'en_route',  label: 'Mechanic On the Way',  desc: 'Your mechanic is heading to you' },
  { key: 'completed', label: 'Job Completed',         desc: 'Repair is done' },
] as const;

const STATUS_ORDER = ['pending', 'accepted', 'en_route', 'completed'] as const;
type StatusKey = (typeof STATUS_ORDER)[number];

function stepIndex(status: string): number {
  return STATUS_ORDER.indexOf(status as StatusKey);
}

// ─── OpenStreetMap embed ─────────────────────────────────────────────────────
function LocationMap({ lat, lon }: { lat: number; lon: number }) {
  const delta = 0.015;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted" style={{ height: 220 }}>
      <iframe
        title="Location Map"
        src={src}
        width="100%"
        height="220"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

// ─── Status badge ────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',     className: 'bg-warning/20 text-warning border-warning/30' },
  accepted:  { label: 'Accepted',    className: 'bg-primary/20 text-primary border-primary/30' },
  en_route:  { label: 'En Route',    className: 'bg-accent/20 text-accent border-accent/30' },
  completed: { label: 'Completed',   className: 'bg-success/20 text-success border-success/30' },
  cancelled: { label: 'Cancelled',   className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

// ─── Main component ──────────────────────────────────────────────────────────
export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests } = useRequests();

  const [request, setRequest] = useState<Request | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalling, setIsCalling] = useState(false);
  const [displayLocation, setDisplayLocation] = useState('');
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Load from context first (instant), then fetch fresh from API
  useEffect(() => {
    const cached = requests.find((r) => String(r.id) === id);
    if (cached) {
      setRequest(cached);
      setIsLoading(false);
    }
    if (!id) return;
    requestsService.getById(id)
      .then((res) => {
        setRequest(res.data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cached) setIsLoading(false);
      });
  }, [id, requests]);

  // Sync request from context updates in real-time
  useEffect(() => {
    const live = requests.find((r) => String(r.id) === id);
    if (live) setRequest(live);
  }, [requests, id]);

  // Reverse geocode + parse coordinates for map
  useEffect(() => {
    if (!request?.location) return;
    const loc = request.location.trim();
    if (isCoordString(loc)) {
      const coords = parseCoordString(loc);
      if (coords) {
        setMapCoords({ lat: coords.lat, lon: coords.lng });
        reverseGeocode(coords.lat, coords.lng)
          .then((addr) => setDisplayLocation(addr ?? 'Near your location'))
          .catch(() => setDisplayLocation('Near your location'));
      }
    } else {
      setDisplayLocation(loc);
    }
  }, [request?.location]);

  const canCall = request?.status === 'accepted' || request?.status === 'en_route';

  const handleCall = async () => {
    if (!id || !canCall) return;
    setIsCalling(true);
    try {
      const res = await requestsService.getCallPartner(id);
      const phone = res.data.phone;
      if (phone) window.location.href = `tel:${phone}`;
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Unable to call mechanic');
    } finally {
      setIsCalling(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border/50 px-4 py-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground">
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        </header>
        <div className="p-4 max-w-md mx-auto space-y-4 animate-pulse">
          <div className="h-6 bg-muted rounded w-40" />
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-[220px] bg-muted rounded-2xl" />
          <div className="h-20 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-foreground font-semibold">Request not found</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm">Go back</button>
      </div>
    );
  }

  const shortId = `#${String(request.id).padStart(6, '0')}`;
  const badge = STATUS_BADGE[request.status] ?? STATUS_BADGE.pending;
  const currentStep = stepIndex(request.status);
  const isCancelled = request.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-foreground truncate">{request.service_type}</h1>
          <p className="text-xs text-muted-foreground">{shortId}</p>
        </div>
        <span className={cn('px-3 py-1 rounded-full text-xs font-medium border shrink-0', badge.className)}>
          {badge.label}
        </span>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">

        {/* Map */}
        {mapCoords && (
          <div className="animate-slide-up">
            <LocationMap lat={mapCoords.lat} lon={mapCoords.lon} />
          </div>
        )}

        {/* Location & Description */}
        <div className="glass-card rounded-2xl p-4 space-y-3 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Location</p>
              <p className="text-sm text-foreground font-medium">
                {displayLocation || request.location || '—'}
              </p>
            </div>
          </div>
          {request.description && (
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Description</p>
                <p className="text-sm text-foreground">{request.description}</p>
              </div>
            </div>
          )}
          {request.created_at && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Requested at</p>
                <p className="text-sm text-foreground">
                  {new Date(request.created_at).toLocaleString('en-UG', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mechanic info (shown when accepted or en_route) */}
        {(request.status === 'accepted' || request.status === 'en_route') && request.mechanic_name && (
          <div className="glass-card rounded-2xl p-4 flex items-center gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Your Mechanic</p>
              <p className="font-semibold text-foreground truncate">{request.mechanic_name}</p>
              {request.status === 'en_route' && (
                <p className="text-xs text-accent mt-0.5 flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> On the way to you
                </p>
              )}
            </div>
          </div>
        )}

        {/* Status Timeline */}
        {!isCancelled && (
          <div className="glass-card rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">Progress</p>
            <div className="space-y-0">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                const isLast = i === STATUS_STEPS.length - 1;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    {/* Icon + connector */}
                    <div className="flex flex-col items-center">
                      {done ? (
                        <CheckCircle2 className={cn('w-5 h-5 shrink-0', active ? 'text-primary' : 'text-success')} />
                      ) : (
                        <Circle className="w-5 h-5 shrink-0 text-muted-foreground/40" />
                      )}
                      {!isLast && (
                        <div className={cn('w-0.5 flex-1 my-1', done && !active ? 'bg-success/50' : 'bg-border/50')} style={{ minHeight: 24 }} />
                      )}
                    </div>
                    {/* Text */}
                    <div className="pb-4">
                      <p className={cn('text-sm font-semibold leading-tight', done ? 'text-foreground' : 'text-muted-foreground/50')}>
                        {step.label}
                      </p>
                      {active && (
                        <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled notice */}
        {isCancelled && (
          <div className="glass-card rounded-2xl p-4 border-destructive/30 bg-destructive/10 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-foreground">This request has been cancelled.</p>
            </div>
          </div>
        )}
      </div>

      {/* Call button — fixed at bottom */}
      {canCall && (
        <div className="fixed bottom-20 inset-x-0 px-4 max-w-md mx-auto">
          <button
            onClick={handleCall}
            disabled={isCalling}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-lg glow-primary"
          >
            {isCalling ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
            {isCalling ? 'Connecting…' : 'Call Mechanic'}
          </button>
        </div>
      )}
    </div>
  );
}
