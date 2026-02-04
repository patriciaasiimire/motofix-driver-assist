// src/services/driverWs.ts
// Example: driver app WebSocket listener for job_taken events
import { getToken } from '@/lib/auth'; // adapt to your auth helper

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function listenForDriverNotifications(myRequestId: number, onTaken: (data: any) => void) {
  const url = API_BASE_URL.replace(/^http/, 'ws') + '/ws/jobs';
  const ws = new WebSocket(url);

  ws.onopen = () => console.log('[Driver WS] connected');
  ws.onmessage = (ev) => {
    try {
      const payload = JSON.parse(ev.data);
      if (payload.type === 'job_taken' && payload.job_id === myRequestId) {
        onTaken(payload);
      }
    } catch (err) {
      console.warn('Driver WS parse error', err);
    }
  };

  ws.onclose = () => console.log('[Driver WS] disconnected');
  ws.onerror = (e) => console.warn('[Driver WS] error', e);

  return () => ws.close();
}

// Usage (example):
// const stop = listenForDriverNotifications(requestId, (data) => {
//   toast('Mechanic accepted', { description: `${data.mechanic.name} accepted your job — ETA ${data.eta_minutes} min` })
// });
// // call stop() when leaving page
