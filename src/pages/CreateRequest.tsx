import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Wrench, FileText, Send, Loader2, LocateFixed } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { requestsService } from '@/config/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const serviceTypes = [
  { value: 'Tire', label: 'Flat Tire / Puncture', icon: '🛞' },
  { value: 'Battery', label: 'Battery Jump Start', icon: '🔋' },
  { value: 'Engine', label: 'Engine Problems', icon: '⚙️' },
  { value: 'Fuel', label: 'Out of Fuel', icon: '⛽' },
  { value: 'Towing', label: 'Need Towing', icon: '🚗' },
  { value: 'Other', label: 'Other Issue', icon: '🔧' },
];

export default function CreateRequest() {
  const [serviceType, setServiceType] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        toast.success('Location detected!');
        setIsGettingLocation(false);
      },
      (error) => {
        toast.error('Unable to get your location. Please enter manually.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceType) {
      toast.error('Please select a service type');
      return;
    }

    if (!location.trim()) {
      toast.error('Please enter your location');
      return;
    }

    setIsLoading(true);
    try {
      await requestsService.create({
        customer_name: user?.full_name || 'Driver',
        service_type: serviceType,
        location: location.trim(),
        description: description.trim(),
        phone: user?.phone || '',
      });

      toast.success('Request submitted! A mechanic will respond soon.');
      navigate('/requests', { replace: true });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to create request';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="New Request" subtitle="Get help with your breakdown" />

      <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto space-y-6">
        {/* Service Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            What's the issue?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {serviceTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setServiceType(type.value)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                  serviceType === type.value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                )}
              >
                <span className="text-2xl">{type.icon}</span>
                <span className="text-sm font-medium leading-tight">
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Location Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Your Location
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter your location or landmark"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleGetLocation}
              disabled={isGettingLocation}
              className="shrink-0"
            >
              <LocateFixed className={cn(
                "w-5 h-5",
                isGettingLocation && "animate-pulse"
              )} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: Use GPS or describe a nearby landmark
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Additional Details (optional)
          </label>
          <textarea
            placeholder="Describe your situation..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={cn(
              "flex w-full rounded-xl border-2 border-border bg-secondary/50 px-4 py-3 text-base text-foreground",
              "placeholder:text-muted-foreground resize-none",
              "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
              "transition-all duration-200"
            )}
          />
        </div>

        {/* Auto-filled phone display */}
        {user?.phone && (
          <div className="glass-card rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Contact number</span>
            <span className="text-sm font-medium text-foreground">{user.phone}</span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading || !serviceType || !location.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send />
              Submit Request
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
