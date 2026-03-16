import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { requestsService, paymentsService } from '@/config/api';
import { createRequestsWs, WsPayload } from '@/services/driverWs';
import { toast } from 'sonner';

export interface QuoteRecord {
  id: number;
  request_id: number;
  quoted_amount: number;
  commission: number;
  mechanic_payout: number;
  quote_approved: boolean;
  collection_status: string;
  disbursement_status: string;
}

export interface Request {
  id: number | string;
  service_type: string;
  location: string;
  description: string;
  status: string;
  created_at?: string;
  mechanic_id?: string;
  mechanic_name?: string;
  mechanic_lat?: number;
  mechanic_lon?: number;
}

interface RequestContextValue {
  requests: Request[];
  isLoading: boolean;
  error: string | null;
  isWsConnected: boolean;
  refresh: () => Promise<void>;
  pendingQuote: QuoteRecord | null;
  pendingQuoteRequestId: string | null;
  setPendingQuote: (q: QuoteRecord | null) => void;
  clearPendingQuote: () => void;
}

const RequestContext = createContext<RequestContextValue | null>(null);

const STATUS_MESSAGES: Record<string, string> = {
  accepted: '🔧 A mechanic has accepted your request!',
  en_route: '🚗 Your mechanic is on the way!',
  completed: '✅ Your request has been completed!',
  cancelled: '❌ Your request was cancelled',
};

export function RequestProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [pendingQuote, setPendingQuote] = useState<QuoteRecord | null>(null);
  const [pendingQuoteRequestId, setPendingQuoteRequestId] = useState<string | null>(null);

  const previousStatusesRef = useRef<Map<string, string>>(new Map());
  const wsEverConnected = useRef(false);
  const quoteCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPendingQuote = useCallback(() => {
    setPendingQuote(null);
    setPendingQuoteRequestId(null);
  }, []);

  const applyUpdates = useCallback((incoming: Request[]) => {
    incoming.forEach((req) => {
      const prev = previousStatusesRef.current.get(String(req.id));
      if (prev && prev !== req.status) {
        const msg = STATUS_MESSAGES[req.status];
        if (msg) toast.success(msg, { duration: 5000 });
      }
      previousStatusesRef.current.set(String(req.id), req.status);
    });
    setRequests(incoming);
  }, []);

  const fetchAll = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    try {
      const res = await requestsService.getAll();
      applyUpdates(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  }, [applyUpdates]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // WebSocket for real-time updates
  useEffect(() => {
    const stop = createRequestsWs(
      (payload: WsPayload) => {
        // Handle status-change events pushed by the backend
        if (payload.type === 'status_update' || payload.type === 'job_taken') {
          // Optimistically update the matching request in state
          setRequests((prev) =>
            prev.map((r) => {
              const rid = String(r.id);
              const pid = String(payload.request_id ?? payload.job_id ?? '');
              if (rid !== pid) return r;
              const updated: Request = {
                ...r,
                status: (payload.status as string) ?? r.status,
                mechanic_id: (payload.mechanic_id as string) ?? r.mechanic_id,
                mechanic_name: (payload.mechanic_name as string) ?? r.mechanic_name,
                mechanic_lat: (payload.mechanic_lat as number) ?? r.mechanic_lat,
                mechanic_lon: (payload.mechanic_lon as number) ?? r.mechanic_lon,
              };
              // Fire toast if status changed
              const prev = previousStatusesRef.current.get(rid);
              if (prev && prev !== updated.status) {
                const msg = STATUS_MESSAGES[updated.status];
                if (msg) toast.success(msg, { duration: 5000 });
              }
              previousStatusesRef.current.set(rid, updated.status);
              return updated;
            })
          );
        }
        // Re-fetch on any event to stay in sync
        fetchAll(false);
      },
      () => {
        setIsWsConnected(true);
        wsEverConnected.current = true;
      },
      () => {
        setIsWsConnected(false);
      },
    );

    return stop;
  }, [fetchAll]);

  // Polling fallback — only runs if WS never connected after 15s
  useEffect(() => {
    const check = setTimeout(() => {
      if (!wsEverConnected.current) {
        // Start 10-second polling as fallback
        const interval = setInterval(() => fetchAll(false), 10_000);
        return () => clearInterval(interval);
      }
    }, 15_000);
    return () => clearTimeout(check);
  }, [fetchAll]);

  const refresh = useCallback(() => fetchAll(false), [fetchAll]);

  // Poll for a pending quote whenever there are accepted/en_route requests
  useEffect(() => {
    const active = requests.filter(
      (r) => r.status === 'accepted' || r.status === 'en_route'
    );

    if (quoteCheckRef.current) clearInterval(quoteCheckRef.current);
    if (active.length === 0) return;

    const checkForQuote = async () => {
      for (const req of active) {
        try {
          const res = await paymentsService.getQuote(String(req.id));
          const q: QuoteRecord = res.data;
          if (q && q.collection_status !== 'success') {
            setPendingQuote(q);
            setPendingQuoteRequestId(String(req.id));
            return;
          }
        } catch {
          // No quote yet — keep polling
        }
      }
    };

    checkForQuote();
    quoteCheckRef.current = setInterval(checkForQuote, 5000);
    return () => { if (quoteCheckRef.current) clearInterval(quoteCheckRef.current); };
  }, [requests]);

  return (
    <RequestContext.Provider value={{
      requests, isLoading, error, isWsConnected, refresh,
      pendingQuote, pendingQuoteRequestId, setPendingQuote, clearPendingQuote,
    }}>
      {children}
    </RequestContext.Provider>
  );
}

export function useRequests() {
  const ctx = useContext(RequestContext);
  if (!ctx) throw new Error('useRequests must be used inside RequestProvider');
  return ctx;
}
