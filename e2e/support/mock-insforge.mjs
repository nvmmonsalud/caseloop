import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 3199;

const server = createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", request.headers.origin || "*");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-api-key, x-csrf-token");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }

  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  response.writeHead(401, { "Content-Type": "application/json" });
  response.end(JSON.stringify({
    error: "AUTH_UNAUTHORIZED",
    message: "No deterministic E2E session is configured.",
  }));
});

server.listen(port, host);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
