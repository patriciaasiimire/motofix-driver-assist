import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Car, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/config/api';
import { toast } from 'sonner';

const STORAGE_USER_KEY = 'motofix_user';

export default function Onboarding() {
  const [fullName, setFullName] = useState('');
  const [numberPlate, setNumberPlate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!numberPlate.trim()) {
      toast.error('Please enter your car number plate');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.updateProfile({
        full_name: fullName.trim(),
        number_plate: numberPlate.trim().toUpperCase(),
      });

      // Update cached user data so the rest of the app sees the fresh info
      const stored = localStorage.getItem(STORAGE_USER_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localStorage.setItem(
            STORAGE_USER_KEY,
            JSON.stringify({ ...parsed, ...response.data })
          );
        } catch {
          // ignore parse errors
        }
      }

      toast.success('Profile saved!');
      navigate('/requests', { replace: true });
    } catch (error: any) {
      const message =
        error.response?.data?.detail || 'Failed to save profile. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        <div className="text-center mb-10 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary flex items-center justify-center">
            <img
              src="/motofix-logo.png"
              alt="Motofix Logo"
              className="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Just a few details before you get started
          </p>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. John Mukasa"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-12"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Car Number Plate</label>
              <div className="relative">
                <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. UAA 123B"
                  value={numberPlate}
                  onChange={(e) => setNumberPlate(e.target.value)}
                  className="pl-12 uppercase"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your vehicle registration number
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || !fullName.trim() || !numberPlate.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      <div className="text-center py-6 text-xs text-muted-foreground">
        <p>By continuing, you agree to our Terms of Service</p>
      </div>
    </div>
  );
}
