import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center animate-pulse-glow">
            <img 
              src="/motofix-logo.png" 
              alt="Motofix Logo" 
              className="w-14 h-14 object-contain"
            />
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
    return <Navigate to="/create-request" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default Index;
