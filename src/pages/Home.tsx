import { Link } from 'react-router-dom';
import { PlusCircle, RefreshCw, AlertCircle, Inbox, Wifi } from 'lucide-react';
import { Header } from '@/components/Header';
import { RequestCard } from '@/components/RequestCard';
import { Button } from '@/components/ui/button';
import { useRequests } from '@/contexts/RequestContext';
import { cn } from '@/lib/utils';

export default function Home() {
  const { requests, isLoading, error, isWsConnected, refresh } = useRequests();

  const activeRequests = requests.filter(
    (r) => !['completed', 'cancelled'].includes(r.status)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Active Requests" subtitle="Your ongoing breakdown requests" />
        <div className="p-4 max-w-md mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
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
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {activeRequests.length} request{activeRequests.length !== 1 ? 's' : ''}
            </h2>
            {/* Live indicator */}
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                isWsConnected
                  ? 'bg-success/15 text-success'
                  : 'bg-muted text-muted-foreground'
              )}
              title={isWsConnected ? 'Live updates active' : 'Polling mode'}
            >
              <Wifi className="w-3 h-3" />
              {isWsConnected ? 'Live' : 'Polling'}
            </div>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
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
            <h3 className="text-lg font-semibold text-foreground mb-2">No active requests</h3>
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
              <RequestCard key={request.id} request={request} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
