import { useNavigate } from 'react-router-dom';
import { User, Phone, Shield, LogOut, ChevronRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const profileItems = [
    {
      icon: User,
      label: 'Name',
      value: user?.full_name || 'Driver',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: user?.phone || '-',
    },
    {
      icon: Shield,
      label: 'Role',
      value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Driver',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profile" subtitle="Manage your account" />

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Profile Header */}
        <div className="glass-card rounded-2xl p-6 text-center animate-slide-up">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary flex items-center justify-center glow-primary">
            <img 
              src="/motofix-logo.png" 
              alt="Motofix Logo" 
              className="w-14 h-14 object-contain"
            />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {user?.full_name || 'Driver'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Motofix Driver Account
          </p>
        </div>

        {/* Profile Details */}
        <div className="glass-card rounded-2xl divide-y divide-border/50 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {profileItems.map((item, index) => (
            <div
              key={item.label}
              className="flex items-center gap-4 p-4"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="glass-card rounded-2xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Help & Support</p>
              <p className="text-xs text-muted-foreground">Get assistance</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* App Info */}
        <div className="glass-card rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">App Version</p>
            <p className="text-sm font-medium text-foreground">Motofix v1.0.0</p>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="destructive"
          className="w-full animate-slide-up"
          style={{ animationDelay: '0.4s' } as React.CSSProperties}
          onClick={handleLogout}
        >
          <LogOut />
          Logout
        </Button>
      </div>
    </div>
  );
}
