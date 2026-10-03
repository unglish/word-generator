import { once } from "node:events";
import { createServer } from "node:http";
import { createConnection } from "node:net";
import { describe, expect, it } from "vitest";
import { trackUnrequestedConnections } from "./shutdown.js";

describe("read-aloud collector shutdown", () => {
  it("closes a real TCP preconnection that has sent no HTTP request", async () => {
    const server = createServer(), closeUnrequested = trackUnrequestedConnections(server);
    await new Promise<void>(accept => server.listen(0, "127.0.0.1", accept));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Test address missing.");
    const accepted = once(server, "connection"), client = createConnection(address.port, "127.0.0.1");
    await once(client, "connect"); await accepted;
    const peerClosed = once(client, "close"), closed = new Promise<void>(accept => server.close(() => accept()));
    closeUnrequested(); await peerClosed; await closed;
    expect(client.destroyed).toBe(true);
  });
  it("preserves an accepted HTTP response while closing an unused connection", async () => {
    let finish: (() => void) | undefined, accepted: (() => void) | undefined;
    const hasRequest = new Promise<void>(accept => { accepted = accept; });
    const server = createServer((request, response) => {
        response.setHeader("Connection", "close");
        finish = () => response.end("accepted request preserved"); accepted!();
      }), closeUnrequested = trackUnrequestedConnections(server);
    await new Promise<void>(accept => server.listen(0, "127.0.0.1", accept));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Test address missing.");
    const connection = once(server, "connection"), idle = createConnection(address.port, "127.0.0.1"); await once(idle, "connect"); await connection;
    const response = fetch(`http://127.0.0.1:${address.port}/`); await hasRequest;
    const closed = new Promise<void>(accept => server.close(() => accept())); closeUnrequested(); finish!();
    expect(await (await response).text()).toBe("accepted request preserved"); await closed;
    idle.destroy();
  });
});
