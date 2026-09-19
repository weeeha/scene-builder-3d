import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { parseTake } from "./src/camera/take";

export type TakeSummary = { id: string; number: number; lensMm: number; durationSec: number; createdAt: number };

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const DEFAULT_DIR = fileURLToPath(new URL("./takes", import.meta.url));

/** Validates the JSON as a take (which also vets the id) and writes it to <dir>/<id>.json. */
export function saveTakeJson(dir: string, json: string): { id: string } {
  const take = parseTake(json);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, take.id + ".json"), json);
  return { id: take.id };
}

/** Summaries of every valid take in the folder, newest first. Files that do not parse are left out. */
export function listTakes(dir: string): TakeSummary[] {
  if (!fs.existsSync(dir)) return [];
  const summaries: TakeSummary[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const take = parseTake(fs.readFileSync(path.join(dir, file), "utf8"));
      summaries.push({ id: take.id, number: take.number, lensMm: take.lensMm, durationSec: take.durationSec, createdAt: take.createdAt });
    } catch {
      // Not a take. The list simply does not show it.
    }
  }
  return summaries.sort((a, b) => b.createdAt - a.createdAt);
}

export function readTakeJson(dir: string, id: string): string | null {
  if (!ID_PATTERN.test(id)) return null;
  const file = path.join(dir, id + ".json");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

/** Resolves with the body text, or null when it is larger than 5 MB. Keeps draining so the socket stays healthy. */
function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(tooLarge ? null : Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Dev-server only: the headset POSTs takes here and the replay page reads them back. */
export function takesPlugin(dir: string = DEFAULT_DIR): Plugin {
  return {
    name: "spike-takes",
    configureServer(server) {
      server.middlewares.use("/takes", (req, res) => {
        const url = (req.url ?? "/").split("?")[0]; // the "/takes" prefix is already stripped
        const isRoot = url === "/" || url === "";

        if (req.method === "POST" && isRoot) {
          readBody(req)
            .then((body) => {
              if (body === null) return send(res, 413, { error: "Take larger than 5 MB" });
              try {
                send(res, 200, saveTakeJson(dir, body));
              } catch (error) {
                send(res, 400, { error: (error as Error).message });
              }
            })
            .catch(() => send(res, 500, { error: "Could not read the request body" }));
          return;
        }

        if (req.method === "GET" && isRoot) return send(res, 200, listTakes(dir));

        const match = req.method === "GET" ? /^\/([A-Za-z0-9_-]+)\.json$/.exec(url) : null;
        if (match) {
          const json = readTakeJson(dir, match[1]);
          return json === null ? send(res, 404, { error: "No such take" }) : send(res, 200, json);
        }

        send(res, 404, { error: "Not found" });
      });
    },
  };
}
