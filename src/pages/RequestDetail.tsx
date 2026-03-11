import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, MapPin, Wrench, Clock, Phone, Loader2,
  CheckCircle2, Circle, AlertCircle, Navigation, User,
  DollarSign, Check, X, Smartphone,
} from 'lucide-react';
import { requestsService, paymentsService } from '@/config/api';
import { toast } from 'sonner';
import { reverseGeocode, isCoordString, parseCoordString } from '@/utils/geocode';
import { useRequests, Request } from '@/contexts/RequestContext';
import { cn } from '@/lib/utils';

// ─── Status timeline ──────────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'pending',   label: 'Request Sent',       desc: 'Looking for a nearby mechanic' },
  { key: 'accepted',  label: 'Mechanic Accepted',   desc: 'Mechanic is on their way' },
  { key: 'en_route',  label: 'Mechanic On the Way', desc: 'Your mechanic is heading to you' },
  { key: 'completed', label: 'Job Completed',        desc: 'Repair is done' },
] as const;

const STATUS_ORDER = ['pending', 'accepted', 'en_route', 'completed'] as const;
type StatusKey = (typeof STATUS_ORDER)[number];

function stepIndex(s: string) {
  return STATUS_ORDER.indexOf(s as StatusKey);
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function LocationMap({ lat, lon }: { lat: number; lon: number }) {
  const delta = 0.015;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  return (
    <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted" style={{ height: 220 }}>
      <iframe
        title="Location Map"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`}
        width="100%" height="220" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer"
      />
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-warning/20 text-warning border-warning/30' },
  accepted:  { label: 'Accepted',  className: 'bg-primary/20 text-primary border-primary/30' },
  en_route:  { label: 'En Route',  className: 'bg-accent/20 text-accent border-accent/30' },
  completed: { label: 'Completed', className: 'bg-success/20 text-success border-success/30' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

interface QuoteRecord {
  id: number;
  quoted_amount: number;
  commission: number;
  mechanic_payout: number;
  quote_approved: boolean;
  collection_status: string;
  disbursement_status: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests } = useRequests();

  const [request, setRequest] = useState<Request | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalling, setIsCalling] = useState(false);
  const [displayLocation, setDisplayLocation] = useState('');
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Quote & payment state
  const [quote, setQuote] = useState<QuoteRecord | null>(null);
  const [isApprovingQuote, setIsApprovingQuote] = useState(false);
  const [momoPhone, setMomoPhone] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const quotePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paymentPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load request ──────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = requests.find((r) => String(r.id) === id);
    if (cached) { setRequest(cached); setIsLoading(false); }
    if (!id) return;
    requestsService.getById(id)
      .then((res) => { setRequest(res.data); setIsLoading(false); })
      .catch(() => { if (!cached) setIsLoading(false); });
  }, [id, requests]);

  useEffect(() => {
    const live = requests.find((r) => String(r.id) === id);
    if (live) setRequest(live);
  }, [requests, id]);

  // Pre-fill MoMo number from stored user profile
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('motofix_user') || '{}');
      if (user?.phone) setMomoPhone(user.phone.replace('+', ''));
    } catch {}
  }, []);

  // ── Geocode ───────────────────────────────────────────────────────────────
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

  // ── Poll for quote every 5 s once mechanic accepted ───────────────────────
  const fetchQuote = useCallback(() => {
    if (!id) return;
    paymentsService.getQuote(id)
      .then((res) => setQuote(res.data))
      .catch(() => {/* no quote yet — keep polling */});
  }, [id]);

  useEffect(() => {
    if (!request) return;
    const status = request.status;

    // Start quote polling as soon as job is accepted (quote was submitted at accept time)
    if (status === 'accepted' || status === 'en_route') {
      fetchQuote(); // immediate first fetch
      quotePollingRef.current = setInterval(fetchQuote, 5000);
      return () => {
        if (quotePollingRef.current) clearInterval(quotePollingRef.current);
      };
    }

    // Stop polling once completed (fetch once to show final state)
    if (status === 'completed') {
      fetchQuote();
    }

    return () => {
      if (quotePollingRef.current) clearInterval(quotePollingRef.current);
    };
  }, [request?.status, fetchQuote]);

  // ── Poll payment status after collection initiated ────────────────────────
  useEffect(() => {
    if (!id || !quote || quote.collection_status !== 'initiated') return;
    paymentPollingRef.current = setInterval(() => {
      paymentsService.getStatus(id).then((res) => {
        const updated: QuoteRecord = res.data;
        setQuote(updated);
        if (updated.collection_status === 'success') {
          if (paymentPollingRef.current) clearInterval(paymentPollingRef.current);
          toast.success('Payment confirmed! The mechanic will continue to your location.');
        } else if (updated.collection_status === 'failed') {
          if (paymentPollingRef.current) clearInterval(paymentPollingRef.current);
          toast.error('Payment failed. Please try again.');
        }
      }).catch(() => {});
    }, 5000);
    return () => { if (paymentPollingRef.current) clearInterval(paymentPollingRef.current); };
  }, [id, quote?.collection_status]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const canCall = request?.status === 'accepted' || request?.status === 'en_route';

  const handleCall = async () => {
    if (!id || !canCall) return;
    setIsCalling(true);
    try {
      const res = await requestsService.getCallPartner(id);
      if (res.data.phone) window.location.href = `tel:${res.data.phone}`;
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Unable to call mechanic');
    } finally {
      setIsCalling(false);
    }
  };

  const handleApproveQuote = async () => {
    if (!id) return;
    setIsApprovingQuote(true);
    try {
      await paymentsService.approveQuote(id);
      setQuote((q) => q ? { ...q, quote_approved: true } : q);
      toast.success('Quote approved!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to approve quote');
    } finally {
      setIsApprovingQuote(false);
    }
  };

  const handlePay = async () => {
    if (!id || !quote) return;
    const phone = momoPhone.trim().replace(/\s+/g, '');
    if (!phone) { toast.error('Enter your MTN MoMo phone number'); return; }
    setIsPaying(true);
    try {
      await paymentsService.collect(id, phone);
      setQuote((q) => q ? { ...q, collection_status: 'initiated' } : q);
      toast.success('Payment initiated — approve the prompt on your phone');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Payment failed. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border/50 px-4 py-4">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
        </header>
        <div className="p-4 max-w-md mx-auto space-y-4 animate-pulse">
          <div className="h-6 bg-muted rounded w-40" />
          <div className="h-[220px] bg-muted rounded-2xl" />
          <div className="h-20 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-foreground font-semibold">Request not found</p>
        <button type="button" onClick={() => navigate(-1)} className="text-primary text-sm">Go back</button>
      </div>
    );
  }

  const shortId = `#${String(request.id).padStart(6, '0')}`;
  const badge = STATUS_BADGE[request.status] ?? STATUS_BADGE.pending;
  const currentStep = stepIndex(request.status);
  const isCancelled = request.status === 'cancelled';

  // Quote display conditions
  const hasQuote = !!quote;
  const quoteApproved = !!quote?.quote_approved;
  const paymentPending = quote?.collection_status === 'initiated';
  const paymentSuccess = quote?.collection_status === 'success';
  const showApproveButtons = hasQuote && !quoteApproved && !paymentPending && !paymentSuccess;
  const showPayButton = hasQuote && quoteApproved && !paymentPending && !paymentSuccess;

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ── Quote modal overlay ────────────────────────────────────────── */}
      {hasQuote && !paymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6">
          <div className="w-full max-w-md bg-card rounded-3xl p-6 shadow-2xl border border-border animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your mechanic quoted</p>
                <p className="text-xl font-bold text-foreground">UGX {quote!.quoted_amount.toLocaleString()}</p>
              </div>
            </div>

            {/* Payment pending */}
            {paymentPending && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 mb-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">Awaiting payment</p>
                  <p className="text-xs text-muted-foreground">Approve the MoMo prompt on your phone</p>
                </div>
              </div>
            )}

            {/* Approve / Reject */}
            {showApproveButtons && (
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Approve the price to continue. The mechanic is waiting.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toast.info('Rejected. The mechanic will be notified.')}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-destructive/10 text-destructive font-bold text-sm border border-destructive/20"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveQuote}
                    disabled={isApprovingQuote}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-success text-success-foreground font-bold text-sm disabled:opacity-60"
                  >
                    {isApprovingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Approve
                  </button>
                </div>
              </>
            )}

            {/* Pay with MoMo */}
            {showPayButton && (
              <>
                <p className="text-xs text-success flex items-center gap-1.5 mb-4">
                  <Check className="w-3.5 h-3.5" /> Quote approved — pay to get started
                </p>
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">+256</span>
                  <input
                    type="tel"
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="771234567"
                    className="w-full pl-14 pr-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isPaying || !momoPhone.trim()}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-60 shadow-sm"
                >
                  {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                  {isPaying ? 'Processing…' : `Pay UGX ${quote!.quoted_amount.toLocaleString()}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors" aria-label="Go back">
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

        {/* Location + description */}
        <div className="glass-card rounded-2xl p-4 space-y-3 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Location</p>
              <p className="text-sm text-foreground font-medium">{displayLocation || request.location || '—'}</p>
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
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mechanic info */}
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

        {/* Payment confirmed inline banner */}
        {paymentSuccess && (
          <div className="glass-card rounded-2xl p-4 animate-slide-up flex items-center gap-3 border border-success/30 bg-success/10" style={{ animationDelay: '0.12s' }}>
            <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
            <div>
              <p className="text-sm font-bold text-success">Payment confirmed</p>
              <p className="text-xs text-muted-foreground">UGX {quote!.quoted_amount.toLocaleString()} — mechanic payout is being processed</p>
            </div>
          </div>
        )}

        {/* Status Timeline */}
        {!isCancelled && (
          <div className="glass-card rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.16s' }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">Progress</p>
            <div className="space-y-0">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                const isLast = i === STATUS_STEPS.length - 1;
                return (
                  <div key={step.key} className="flex items-start gap-3">
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
                    <div className="pb-4">
                      <p className={cn('text-sm font-semibold leading-tight', done ? 'text-foreground' : 'text-muted-foreground/50')}>
                        {step.label}
                      </p>
                      {active && <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <div className="glass-card rounded-2xl p-4 border-destructive/30 bg-destructive/10 animate-slide-up" style={{ animationDelay: '0.16s' }}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-foreground">This request has been cancelled.</p>
            </div>
          </div>
        )}
      </div>

      {/* Call button */}
      {canCall && (
        <div className="fixed bottom-20 inset-x-0 px-4 max-w-md mx-auto">
          <button
            type="button"
            onClick={handleCall}
            disabled={isCalling}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-lg glow-primary"
          >
            {isCalling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
            {isCalling ? 'Connecting…' : 'Call Mechanic'}
          </button>
        </div>
      )}
    </div>
  );
}
