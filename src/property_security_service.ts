import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiControlPlane, InfraiError } from "./infrai_control_plane.ts";
import { drillRequestSchema, runLeakedKeyDrill } from "./leaked_key_drill.ts";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const infrai = new InfraiControlPlane(apiKey);

function send(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/drills/leaked-key") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = drillRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    send(response, 200, await runLeakedKeyDrill(input, infrai));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "Invalid drill request" });
      return;
    }
    if (error instanceof InfraiError) {
      send(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.message,
        code: error.code
      });
      return;
    }
    send(response, 502, { error: "The drill could not be completed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Property security service listening on http://localhost:${port}`));
