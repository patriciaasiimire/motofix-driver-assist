import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import { Header } from '@/components/Header';
import { RequestCard } from '@/components/RequestCard';
import { Button } from '@/components/ui/button';
import { requestsService } from '@/config/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Request {
  id: string;
  service_type: string;
  location: string;
  description: string;
  status: string;
  created_at?: string;
}

export default function Home() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousStatusesRef = useRef<Map<string, string>>(new Map());

  const fetchRequests = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);

    try {
      const response = await requestsService.getAll();
      const newRequests: Request[] = response.data || [];
      
      // Check for status changes and show toasts
      newRequests.forEach((request) => {
        const previousStatus = previousStatusesRef.current.get(request.id);
        if (previousStatus && previousStatus !== request.status) {
          const statusMessages: Record<string, string> = {
            accepted: '🔧 A mechanic has accepted your request!',
            in_progress: '🛠️ Repair work is in progress!',
            completed: '✅ Your request has been completed!',
            cancelled: '❌ Your request was cancelled',
          };
          const message = statusMessages[request.status];
          if (message) {
            toast.success(message, { duration: 5000 });
          }
        }
        previousStatusesRef.current.set(request.id, request.status);
      });

      setRequests(newRequests);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to load requests';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Polling every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRequests(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRequests(false);
  };

  // Show only active requests on home page
  const activeRequests = requests.filter(
    (r) => !['completed', 'cancelled'].includes(r.status)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Active Requests" subtitle="Your ongoing breakdown requests" />
        <div className="p-4 max-w-md mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-4 animate-pulse"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
                <div className="h-6 bg-muted rounded-full w-16" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Active Requests" subtitle="Your ongoing breakdown requests" />

      <div className="p-4 max-w-md mx-auto">
        {/* Refresh button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            {activeRequests.length} request{activeRequests.length !== 1 ? 's' : ''}
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="glass-card rounded-2xl p-4 mb-4 border-destructive/50 bg-destructive/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-foreground">{error}</p>
            </div>
          </div>
        )}

        {activeRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <Inbox className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No active requests
            </h3>
            <p className="text-muted-foreground mb-6">
              Create a new request when you need assistance
            </p>
            <Button asChild>
              <Link to="/create-request">
                <PlusCircle />
                Create Request
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeRequests.map((request, index) => (
              <RequestCard
                key={request.id}
                request={request}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
