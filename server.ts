// Custom Next.js entry point that optionally attaches Socket.IO.
// Usage:
//   dev (with multiplayer): tsx server.ts
//   production:             node --import tsx/esm server.ts   (or: npx tsx server.ts)
//
// When MULTIPLAYER env var is not "true", this behaves identically to `next start`.
import { createServer } from "http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => handle(req, res));

  if (process.env.MULTIPLAYER === "true") {
    // Dynamic import keeps socket.io out of the bundle when dark.
    const { attachSocketIO } = await import("./src/server/socket/index");
    attachSocketIO(httpServer);
  }

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
