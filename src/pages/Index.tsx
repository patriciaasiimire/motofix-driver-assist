import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Bike } from 'lucide-react';

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center animate-pulse-glow">
            <Bike className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-muted-foreground font-medium">Loading Motofix...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect based on auth status
  if (isAuthenticated) {
    return <Navigate to="/requests" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default Index;
