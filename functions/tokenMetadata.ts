const METADATA_STORE_PATH = "data/token-metadata.json";

function sanitizeText(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

async function readStore(): Promise<Record<string, any>> {
  try {
    const raw = await Deno.readTextFile(METADATA_STORE_PATH);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: Record<string, any>): Promise<void> {
  await Deno.mkdir("data", { recursive: true });
  await Deno.writeTextFile(METADATA_STORE_PATH, JSON.stringify(store, null, 2));
}

function isLocalHostname(hostname: string): boolean {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
}

function getMetadataBaseUrl(req: Request): string {
  const preferredBase = sanitizeText(
    Deno.env.get("PUBLIC_API_BASE_URL") || Deno.env.get("VITE_API_BASE_URL")
  ).replace(/\/+$/, "");
  if (preferredBase) return preferredBase;

  const url = new URL(req.url);
  if (!isLocalHostname(url.hostname)) {
    return url.origin;
  }

  return url.origin;
}

export async function createTokenMetadata(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json();
    const name = sanitizeText(body?.name);
    const symbol = sanitizeText(body?.symbol).toUpperCase();
    const description = sanitizeText(body?.description);
    const image = sanitizeText(body?.image);
    const externalUrl = sanitizeText(body?.external_url);

    if (!name || !symbol) {
      return Response.json({ error: "name and symbol are required" }, { status: 400 });
    }

    const id = crypto.randomUUID().replace(/-/g, "");
    const metadata = {
      name,
      symbol,
      description,
      image,
      external_url: externalUrl || undefined,
      properties: {
        category: "image",
        files: image ? [{ uri: image, type: "image/png" }] : [],
      },
    };

    const store = await readStore();
    store[id] = metadata;
    await writeStore(store);

    const baseUrl = getMetadataBaseUrl(req);
    const uri = `${baseUrl}/api/token-metadata/${id}`;
    return Response.json({ success: true, id, uri, metadata });
  } catch (error) {
    return Response.json({ error: error?.message || "Failed to create metadata" }, { status: 500 });
  }
}

export async function getTokenMetadataById(id: string): Promise<Response> {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) {
      return Response.json({ error: "Invalid metadata id" }, { status: 400 });
    }
    const store = await readStore();
    const item = store[cleanId];
    if (!item) {
      return Response.json({ error: "Metadata not found" }, { status: 404 });
    }
    return Response.json(item, { status: 200 });
  } catch (error) {
    return Response.json({ error: error?.message || "Failed to load metadata" }, { status: 500 });
  }
}
