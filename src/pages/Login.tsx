import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Phone, KeyRound, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/config/api';
import { toast } from 'sonner';

type Step = 'phone' | 'otp';

export default function Login() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/requests', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format for Uganda (+256)
    if (digits.startsWith('256')) {
      return '+' + digits;
    } else if (digits.startsWith('0')) {
      return '+256' + digits.slice(1);
    } else if (digits.length > 0) {
      return '+256' + digits;
    }
    return '';
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedPhone = formatPhone(phone);
    if (formattedPhone.length < 13) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      await authService.sendOtp(formattedPhone);
      setPhone(formattedPhone);
      setStep('otp');
      toast.success('OTP sent successfully!');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to send OTP';
      if (message.includes('not found') || message.includes('new')) {
        setIsNewUser(true);
        setPhone(formattedPhone);
        setStep('otp');
        toast.info('Welcome! Please complete registration.');
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length < 4) {
      toast.error('Please enter a valid OTP');
      return;
    }

    if (isNewUser && !fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      await login(phone, otp, isNewUser ? fullName : undefined);
      toast.success('Welcome to Motofix!');
      navigate('/requests', { replace: true });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Invalid OTP';
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
        {/* Logo & Welcome */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary flex items-center justify-center glow-primary-intense">
            <img 
    src="/motofix-logo.png"           // ← put your image in public/ folder
    alt="Motofix Logo" 
    className="w-14 h-14 object-contain"  // adjust size as needed
  />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">MOTOFIX</h1>
          <p className="text-muted-foreground">
            {step === 'phone' 
              ? 'Get help when you need it most'
              : 'Enter the code sent to your phone'}
          </p>
        </div>

        {/* Form */}
        <div className="w-full max-w-sm mx-auto">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4 animate-slide-up">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="0700 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-12"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your a verification code is coming shortly via SMS
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading || !phone}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    It's coming...
                  </>
                ) : (
                  <>
                    Let's go!
                    <ArrowRight />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4 animate-slide-up">
              {isNewUser && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">What's Your Name</label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Verification Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-12 text-center text-lg tracking-[0.5em]"
                    maxLength={6}
                    autoFocus={!isNewUser}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Sent to {phone}
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading || otp.length < 4}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    We're just makin' sure...
                  </>
                ) : (
                  <>
                    {isNewUser ? 'Create Account' : 'Login'}
                    <ArrowRight />
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setIsNewUser(false);
                }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Wanna change phone number?
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-muted-foreground">
        <p>By continuing, you agree to our Terms of Service</p>
      </div>
    </div>
  );
}
