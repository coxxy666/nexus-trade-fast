const METADATA_STORE_PATH = "data/token-metadata.json";
const TOKEN_METADATA_KV_PREFIX = ["savememe", "token_metadata"] as const;
const KV_ENABLED = ["1", "true", "yes", "on"].includes(String(Deno.env.get("USE_DENO_KV") || "").toLowerCase());
const KV_PATH = String(Deno.env.get("DENO_KV_PATH") || "").trim() || undefined;

let kvPromise: Promise<Deno.Kv | null> | null = null;

async function getKv(): Promise<Deno.Kv | null> {
  if (!KV_ENABLED) return null;
  if (!kvPromise) {
    kvPromise = Deno.openKv(KV_PATH).catch(() => null);
  }
  return kvPromise;
}

function sanitizeText(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

async function readStore(): Promise<Record<string, any>> {
  const kv = await getKv();
  if (kv) {
    const out: Record<string, any> = {};
    for await (const entry of kv.list<Record<string, any>>({ prefix: [...TOKEN_METADATA_KV_PREFIX] })) {
      const id = String(entry.key.at(-1) || "");
      if (id && entry.value) out[id] = entry.value;
    }
    return out;
  }

  try {
    const raw = await Deno.readTextFile(METADATA_STORE_PATH);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: Record<string, any>): Promise<void> {
  const kv = await getKv();
  if (kv) {
    const existingKeys: Deno.KvKey[] = [];
    for await (const entry of kv.list({ prefix: [...TOKEN_METADATA_KV_PREFIX] })) {
      existingKeys.push(entry.key);
    }

    const chunkSize = 50;
    for (let i = 0; i < existingKeys.length; i += chunkSize) {
      const atomic = kv.atomic();
      for (const key of existingKeys.slice(i, i + chunkSize)) {
        atomic.delete(key);
      }
      await atomic.commit();
    }

    for (const [id, metadata] of Object.entries(store)) {
      await kv.set([...TOKEN_METADATA_KV_PREFIX, id], metadata);
    }
    return;
  }

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
    const chain = sanitizeText(body?.chain, "solana").toLowerCase();
    const creatorWallet = sanitizeText(body?.creator_wallet || body?.creatorWallet);
    const createdVia = sanitizeText(body?.created_via, "SaveMeme") || "SaveMeme";
    const launchSource = sanitizeText(body?.launch_source, "SaveMeme") || "SaveMeme";
    const category = sanitizeText(body?.category, "meme") || "meme";
    const timestamp = sanitizeText(body?.timestamp) || new Date().toISOString();
    const aiChecked = Boolean(body?.ai_checked ?? body?.aiChecked ?? false);
    const creatorAuthority = sanitizeText(body?.creator_authority || body?.creatorAuthority);
    const attributionProgram = sanitizeText(body?.attribution_program || body?.attributionProgram);
    const factoryAddress = sanitizeText(body?.factory_address || body?.factoryAddress);
    const verifiedSource = sanitizeText(body?.verified_source || body?.verifiedSource);
    const vanityPrefix = sanitizeText(body?.vanity_prefix || body?.vanityPrefix);

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
      attributes: [
        { trait_type: "created_via", value: createdVia },
        { trait_type: "launch_source", value: launchSource },
        { trait_type: "category", value: category },
        { trait_type: "creator_wallet", value: creatorWallet || "unknown" },
        { trait_type: "chain", value: chain },
        { trait_type: "timestamp", value: timestamp },
        { trait_type: "ai_checked", value: aiChecked ? "true" : "false" },
        { trait_type: "creator_authority", value: creatorAuthority || "self" },
        { trait_type: "attribution_program", value: attributionProgram || undefined },
        { trait_type: "factory_address", value: factoryAddress || undefined },
        { trait_type: "verified_source", value: verifiedSource || undefined },
        { trait_type: "vanity_prefix", value: vanityPrefix || undefined },
      ].filter((item) => item.value !== undefined),
      properties: {
        category: "image",
        files: image ? [{ uri: image, type: "image/png" }] : [],
      },
      extensions: {
        created_via: createdVia,
        launch_source: launchSource,
        category,
        creator_wallet: creatorWallet || undefined,
        timestamp,
        chain,
        ai_checked: aiChecked,
        creator_authority: creatorAuthority || undefined,
        attribution_program: attributionProgram || undefined,
        factory_address: factoryAddress || undefined,
        verified_source: verifiedSource || undefined,
        vanity_prefix: vanityPrefix || undefined,
      },
      save_meme: {
        created_via: createdVia,
        launch_source: launchSource,
        category,
        creator_wallet: creatorWallet || undefined,
        timestamp,
        chain,
        ai_checked: aiChecked,
        creator_authority: creatorAuthority || undefined,
        attribution_program: attributionProgram || undefined,
        factory_address: factoryAddress || undefined,
        verified_source: verifiedSource || undefined,
        vanity_prefix: vanityPrefix || undefined,
      },
    };

    const store = await readStore();
    store[id] = metadata;
    await writeStore(store);

    const baseUrl = getMetadataBaseUrl(req);
    const uri = `${baseUrl}/api/token-metadata/${id}`;
    return Response.json({ success: true, id, uri, metadata, storage: (await getKv()) ? "deno-kv" : "file" });
  } catch (error) {
    return Response.json({ error: (error as Error)?.message || "Failed to create metadata" }, { status: 500 });
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
    return Response.json({ error: (error as Error)?.message || "Failed to load metadata" }, { status: 500 });
  }
}
