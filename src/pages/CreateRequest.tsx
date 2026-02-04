import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Mic, Camera, Paperclip, Send, Loader2, LocateFixed, X, Play, Pause, Eye } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { requestsService } from '@/config/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { reverseGeocode, isCoordString, parseCoordString } from '@/utils/geocode';

interface MediaFileWithPreview extends File {
  preview?: string; // For images
}

export default function CreateRequest() {
  const [location, setLocation] = useState('');
  const [issue, setIssue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [friendlyAddress, setFriendlyAddress] = useState<string | null>(null);
  const [addressStatus, setAddressStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [mediaFiles, setMediaFiles] = useState<MediaFileWithPreview[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const audioPlayersRef = useRef<HTMLAudioElement[]>([]);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Auto-detect location on mount
  useEffect(() => {
    autoDetectLocation();
  }, []);

  // Reverse geocode for display only when location is coordinates (debounced 1s)
  useEffect(() => {
    const loc = location.trim();
    if (!isCoordString(loc)) {
      setFriendlyAddress(null);
      setAddressStatus('idle');
      return;
    }
    const coords = parseCoordString(loc);
    if (!coords) return;

    const t = setTimeout(() => {
      setAddressStatus('loading');
      reverseGeocode(coords.lat, coords.lng)
        .then((address) => {
          if (address) {
            setFriendlyAddress(address);
            setAddressStatus('done');
          } else {
            setFriendlyAddress('Near your current location');
            setAddressStatus('error');
            toast.error("Couldn't find address — type manually");
          }
        })
        .catch(() => {
          setFriendlyAddress('Near your current location');
          setAddressStatus('error');
          toast.error("Couldn't find address — type manually");
        });
    }, 1000);

    return () => clearTimeout(t);
  }, [location]);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        }
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Add preview URL for audio
        (audioFile as MediaFileWithPreview).preview = URL.createObjectURL(audioBlob);
        
        setMediaFiles([...mediaFiles, audioFile]);
        toast.success('Voice note recorded!');
        console.log('🎙️ Voice note added, size:', audioBlob.size);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.info('Recording... Speak clearly');
    } catch (error) {
      console.error('❌ Microphone error:', error);
      toast.error('Unable to access microphone. Check browser permissions.');
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
    const filesWithPreview = files.map(file => {
      const fileWithPreview = file as MediaFileWithPreview;
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      return fileWithPreview;
    });
    setMediaFiles([...mediaFiles, ...filesWithPreview]);
    toast.success(`${files.length} file(s) added`);
    console.log('📎 Files added:', files.map(f => f.name));
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const filesWithPreview = files.map(file => {
      const fileWithPreview = file as MediaFileWithPreview;
      fileWithPreview.preview = URL.createObjectURL(file);
      return fileWithPreview;
    });
    setMediaFiles([...mediaFiles, ...filesWithPreview]);
    toast.success('Photo added!');
    console.log('📷 Photo captured');
  };

  const playAudio = (index: number) => {
    if (audioPlayersRef.current[index]) {
      if (audioPlayersRef.current[index].paused) {
        audioPlayersRef.current[index].play();
        setPlayingAudio(index);
      } else {
        audioPlayersRef.current[index].pause();
        setPlayingAudio(null);
      }
    }
  };

  const removeMedia = (index: number) => {
    const file = mediaFiles[index];
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    const updated = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(updated);
    if (audioPlayersRef.current[index]) {
      audioPlayersRef.current[index].pause();
    }
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

      let response;

      // If there are media files, use FormData
      if (mediaFiles.length > 0) {
        const formData = new FormData();
        formData.append('customer_name', user?.full_name || 'Driver');
        formData.append('service_type', 'Other');
        formData.append('location', location.trim());
        formData.append('description', issue.trim());
        formData.append('phone', user?.phone || '');
        
        // Append media files
        mediaFiles.forEach((file, index) => {
          formData.append(`media_files`, file);
        });

        response = await requestsService.createWithMedia(formData);
      } else {
        // Submit without files
        response = await requestsService.create({
          customer_name: user?.full_name || 'Driver',
          service_type: 'Other',
          location: location.trim(),
          description: issue.trim(),
          phone: user?.phone || '',
        });
      }

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
              className="flex-1 min-h-[2.75rem]"
              disabled={isGettingLocation}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleGetLocation}
              disabled={isGettingLocation}
              className="shrink-0 min-h-[2.75rem] min-w-[2.75rem]"
            >
              <LocateFixed className={cn("w-5 h-5", isGettingLocation && "animate-pulse")} />
            </Button>
          </div>
          {addressStatus === 'loading' && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              Finding address...
            </p>
          )}
          {addressStatus === 'done' && friendlyAddress && (
            <p className="text-sm text-muted-foreground line-clamp-2" title={friendlyAddress}>
              📍 {friendlyAddress}
            </p>
          )}
          {addressStatus === 'error' && friendlyAddress && (
            <p className="text-sm text-muted-foreground">📍 {friendlyAddress}</p>
          )}
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
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {mediaFiles.length} item{mediaFiles.length !== 1 ? 's' : ''} attached
              </p>
              <div className="space-y-2">
                {mediaFiles.map((file, idx) => {
                  const isImage = file.type.startsWith('image/');
                  const isAudio = file.type.startsWith('audio/');
                  
                  return (
                    <div
                      key={idx}
                      className="rounded-lg bg-secondary/50 overflow-hidden border border-border/50"
                    >
                      {/* Image Preview */}
                      {isImage && file.preview && (
                        <div className="relative">
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-full h-32 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImage(file.preview!)}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded p-1 transition-all"
                          >
                            <Eye className="w-4 h-4 text-white" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            className="absolute top-2 left-2 bg-red-500/80 hover:bg-red-600 rounded p-1 transition-all"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      )}

                      {/* Audio Playback */}
                      {isAudio && (
                        <div className="p-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playAudio(idx)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2 transition-all"
                          >
                            {playingAudio === idx ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">
                              🎙️ {file.name.replace(/\.webm$|\.mp3$/, '')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            className="text-muted-foreground hover:text-foreground flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <audio
                            ref={(el) => {
                              if (el) audioPlayersRef.current[idx] = el;
                            }}
                            src={file.preview || URL.createObjectURL(file)}
                            onEnded={() => setPlayingAudio(null)}
                          />
                        </div>
                      )}

                      {/* Other Files */}
                      {!isImage && !isAudio && (
                        <div className="p-3 flex items-center gap-2">
                          <span className="text-xl">📎</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            className="text-muted-foreground hover:text-foreground flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Image Preview Modal */}
          {previewImage && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setPreviewImage(null)}
            >
              <div className="relative max-w-2xl max-h-[80vh]">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
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
