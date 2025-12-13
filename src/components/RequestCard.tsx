import { MapPin, Wrench, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Request {
  id: string;
  service_type: string;
  location: string;
  description: string;
  status: string;
  created_at?: string;
}

interface RequestCardProps {
  request: Request;
  index: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-warning/20 text-warning border-warning/30',
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-accent/20 text-accent border-accent/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-success/20 text-success border-success/30',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
};

export function RequestCard({ request, index }: RequestCardProps) {
  const status = statusConfig[request.status] || statusConfig.pending;
  
  return (
    <div 
      className="glass-card rounded-2xl p-4 animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{request.service_type}</h3>
            <p className="text-sm text-muted-foreground">#{request.id.slice(0, 8)}</p>
          </div>
        </div>
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-medium border",
          status.className
        )}>
          {status.label}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-muted-foreground line-clamp-1">{request.location}</span>
        </div>
        {request.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 pl-6">
            {request.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {request.created_at 
              ? new Date(request.created_at).toLocaleDateString('en-UG', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Just now'}
          </span>
        </div>
        <button className="flex items-center gap-1 text-primary text-sm font-medium hover:gap-2 transition-all">
          View Details
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
