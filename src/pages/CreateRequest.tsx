import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Mic, Camera, Paperclip, Send, Loader2, LocateFixed, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { requestsService } from '@/config/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CreateRequest() {
  const [location, setLocation] = useState('');
  const [issue, setIssue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Auto-detect location on mount
  useEffect(() => {
    autoDetectLocation();
  }, []);

  const autoDetectLocation = () => {
    if (!navigator.geolocation) {
      setIsGettingLocation(false);
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        console.log('✅ Location auto-detected:', location);
        setIsGettingLocation(false);
      },
      (error) => {
        console.warn('⚠️ Location detection failed:', error.message);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

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
        console.log('✅ Location updated:', location);
        setIsGettingLocation(false);
      },
      (error) => {
        toast.error('Unable to get your location. Please enter manually.');
        console.error('❌ Location error:', error);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        setMediaFiles([...mediaFiles, audioFile]);
        toast.success('Voice note recorded!');
        console.log('🎙️ Voice note added');

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.info('Recording...');
    } catch (error) {
      console.error('❌ Microphone error:', error);
      toast.error('Unable to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles([...mediaFiles, ...files]);
    toast.success(`${files.length} file(s) added`);
    console.log('📎 Files added:', files.map(f => f.name));
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles([...mediaFiles, ...files]);
    toast.success('Photo added!');
    console.log('📷 Photo captured');
  };

  const removeMedia = (index: number) => {
    const updated = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(updated);
    toast.success('File removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issue.trim()) {
      toast.error('Please describe your issue');
      return;
    }

    if (!location.trim()) {
      toast.error('Please provide your location');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📤 Submitting request:', {
        customer_name: user?.full_name,
        issue: issue.trim(),
        location: location.trim(),
        phone: user?.phone,
        media_files: mediaFiles.length,
      });

      // For now, submit without files (backend needs to support FormData)
      const response = await requestsService.create({
        customer_name: user?.full_name || 'Driver',
        service_type: 'Other', // Drivers now just describe, so default to Other
        location: location.trim(),
        description: issue.trim(),
        phone: user?.phone || '',
      });

      console.log('✅ Request submitted successfully:', response.data);
      toast.success('Request submitted! A mechanic will respond soon.');
      
      // Reset form
      setIssue('');
      setMediaFiles([]);
      
      // Navigate to requests view
      navigate('/requests', { replace: true });
    } catch (error: any) {
      console.error('❌ Request submission failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      const message = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to create request';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Request Help" subtitle="Describe your breakdown issue" />

      <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto space-y-4">
        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Your Location
            {isGettingLocation && <Loader2 className="w-3 h-3 animate-spin text-primary/60" />}
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={isGettingLocation ? "Detecting..." : "Enter location or landmark"}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1"
              disabled={isGettingLocation}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleGetLocation}
              disabled={isGettingLocation}
              className="shrink-0"
            >
              <LocateFixed className={cn("w-5 h-5", isGettingLocation && "animate-pulse")} />
            </Button>
          </div>
        </div>

        {/* Issue Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Describe your issue
          </label>
          <textarea
            placeholder="What's wrong with your bike? (tire, engine, battery, towing, etc.)"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            rows={4}
            className={cn(
              "flex w-full rounded-xl border-2 border-border bg-secondary/50 px-4 py-3 text-base text-foreground",
              "placeholder:text-muted-foreground resize-none",
              "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
              "transition-all duration-200"
            )}
          />
        </div>

        {/* Media Options */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Add Details (optional)
          </label>
          <div className="flex gap-2">
            {/* Voice Note */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2 transition-all",
                isRecording
                  ? "border-red-500 bg-red-500/10 text-red-600"
                  : "border-border hover:border-primary/50 text-muted-foreground"
              )}
            >
              <Mic className="w-4 h-4" />
              {isRecording ? "Stop" : "Voice"}
            </button>

            {/* Camera */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-border hover:border-primary/50 py-2 text-muted-foreground transition-all"
            >
              <Camera className="w-4 h-4" />
              Photo
            </button>

            {/* File Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-border hover:border-primary/50 py-2 text-muted-foreground transition-all"
            >
              <Paperclip className="w-4 h-4" />
              Files
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />

          {/* Media preview */}
          {mediaFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {mediaFiles.length} item{mediaFiles.length !== 1 ? 's' : ''} attached
              </p>
              <div className="flex flex-wrap gap-2">
                {mediaFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs"
                  >
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact Info */}
        {user?.phone && (
          <div className="text-xs text-muted-foreground text-center">
            Mechanic will contact: <span className="font-medium text-foreground">{user.phone}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading || !issue.trim() || !location.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Request
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
