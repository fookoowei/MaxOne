import { io, type Socket } from 'socket.io-client';

// The browser connects DIRECTLY to the backend (NEXT_PUBLIC_WS_URL) with the ticket — not via the BFF.
export function connectSocket(ticket: string): Socket {
  return io(process.env.NEXT_PUBLIC_WS_URL ?? '', {
    auth: { ticket },
    transports: ['websocket'],
  });
}
