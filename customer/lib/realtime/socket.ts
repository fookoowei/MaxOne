import { io, type Socket } from 'socket.io-client';

// The browser connects DIRECTLY to the backend (NEXT_PUBLIC_WS_URL) with the ticket — not via the BFF.
export function connectSocket(ticket: string): Socket {
  const url = process.env.NEXT_PUBLIC_WS_URL;
  // M17: required, no fallback — an empty string would silently connect to the Vercel origin,
  // which has no Socket.IO server. Set it to the API's public URL (see DEPLOY.md).
  if (!url) throw new Error('NEXT_PUBLIC_WS_URL is not set');
  return io(url, {
    auth: { ticket },
    transports: ['websocket'],
  });
}
