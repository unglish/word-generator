import type { Server } from "node:http";
import type { Socket } from "node:net";

/** A speculative TCP connection has no accepted HTTP request to drain. */
export function trackUnrequestedConnections(server: Server): () => void {
  const unrequested = new Set<Socket>();
  server.on("connection", socket => {
    unrequested.add(socket); socket.once("close", () => unrequested.delete(socket));
  });
  server.on("request", request => { unrequested.delete(request.socket); });
  return () => { for (const socket of unrequested) socket.destroy(); };
}
