import type { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;

export function attachSocket(socketServer: SocketServer): void {
  io = socketServer;
}

export function emitToClients(event: string, payload: unknown): void {
  io?.emit(event, payload);
}
