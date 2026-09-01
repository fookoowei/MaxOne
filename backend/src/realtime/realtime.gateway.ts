import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';

// Browser connects DIRECTLY here (not via the BFF) with a short-lived ticket in the handshake.
// cors: reflect origin for the sandbox — tighten to the customer origin for prod.
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway {
  @WebSocketServer() server!: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const ticket = client.handshake.auth?.ticket as string | undefined;
      const payload = await this.jwt.verifyAsync<{ sub: string; purpose?: string }>(ticket ?? '');
      if (payload.purpose !== 'ws') throw new Error('wrong ticket purpose');
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }
}
