import { enqueueTokenAnnouncement } from "./tokenAnnouncementQueue.ts";
import { isPostgresStoreEnabled, readJsonStore, writeJsonStore } from "./postgresStore.ts";

const SAVE_MEME_REGISTRY_PATH = "data/savememe-minted-tokens.json";
const SAVE_MEME_KV_PREFIX = ["savememe", "minted_tokens"] as const;
const SAVE_MEME_POSTGRES_TABLE = "savememe_minted_tokens";
const KV_ENABLED = ["1", "true", "yes", "on"].includes(String(Deno.env.get("USE_DENO_KV") || "").toLowerCase());
const KV_PATH = String(Deno.env.get("DENO_KV_PATH") || "").trim() || undefined;

let kvPromise: Promise<Deno.Kv | null> | null = null;

function getStorageMode(): "postgres" | "deno-kv" | "file" {
  if (isPostgresStoreEnabled()) return "postgres";
  return KV_ENABLED ? "deno-kv" : "file";
}

async function getKv(): Promise<Deno.Kv | null> {
  if (!KV_ENABLED) return null;
  if (!kvPromise) {
    kvPromise = Deno.openKv(KV_PATH).catch(() => null);
  }
  return kvPromise;
}

export type SaveMemeMintedTokenRecord = {
  id: string;
  token_address: string;
  chain: "solana" | "bsc";
  creator_wallet: string;
  name: string;
  symbol: string;
  created_at: string;
  created_via: string;
  launch_source: string;
  category: string;
  timestamp: string;
  tx_hash?: string;
  metadata_uri?: string;
  logo_url?: string;
  explorer_url?: string;
  ai_checked?: boolean;
  ai_scan?: Record<string, unknown> | null;
  attributes?: Record<string, unknown>;
  creator_authority?: string;
  attribution_program?: string;
  factory_address?: string;
  verified_source?: string;
  vanity_prefix?: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sanitizeText(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

function normalizeChain(value: unknown): "solana" | "bsc" | "" {
  const chain = sanitizeText(value).toLowerCase();
  if (["solana", "spl"].includes(chain)) return "solana";
  if (["bsc", "bnb", "bnb chain", "bnb smart chain", "bep20"].includes(chain)) return "bsc";
  return "";
}

function isSolanaAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value || "").trim());
}

function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
}

function normalizeAddress(address: string, chain: "solana" | "bsc"): string {
  const clean = sanitizeText(address);
  return chain === "bsc" ? clean.toLowerCase() : clean;
}

function explorerFor(chain: "solana" | "bsc", address: string): string {
  if (chain === "solana") return `https://solscan.io/token/${address}`;
  return `https://bscscan.com/token/${address}`;
}

async function readStore(): Promise<SaveMemeMintedTokenRecord[]> {
  if (isPostgresStoreEnabled()) {
    const records = await readJsonStore<SaveMemeMintedTokenRecord>(SAVE_MEME_POSTGRES_TABLE);
    if (records) return records;
  }

  const kv = await getKv();
  if (kv) {
    const records: SaveMemeMintedTokenRecord[] = [];
    for await (const entry of kv.list<SaveMemeMintedTokenRecord>({ prefix: [...SAVE_MEME_KV_PREFIX] })) {
      if (entry.value) records.push(entry.value);
    }
    return records.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  try {
    const raw = await Deno.readTextFile(SAVE_MEME_REGISTRY_PATH);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(records: SaveMemeMintedTokenRecord[]): Promise<void> {
  if (isPostgresStoreEnabled()) {
    const stored = await writeJsonStore(SAVE_MEME_POSTGRES_TABLE, records);
    if (stored) return;
  }

  const kv = await getKv();
  if (kv) {
    const existingKeys: Deno.KvKey[] = [];
    for await (const entry of kv.list({ prefix: [...SAVE_MEME_KV_PREFIX] })) {
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

    for (const record of records) {
      await kv.set([...SAVE_MEME_KV_PREFIX, record.chain, record.token_address], record);
    }
    return;
  }

  await Deno.mkdir("data", { recursive: true });
  await Deno.writeTextFile(SAVE_MEME_REGISTRY_PATH, JSON.stringify(records, null, 2));
}

function buildRecord(body: Record<string, unknown>): SaveMemeMintedTokenRecord {
  const chain = normalizeChain(body?.chain);
  if (!chain) throw new Error("chain must be 'solana' or 'bsc'");

  const tokenAddress = normalizeAddress(sanitizeText(body?.token_address || body?.address), chain);
  const creatorWallet = sanitizeText(body?.creator_wallet || body?.creatorWallet);
  const name = sanitizeText(body?.name);
  const symbol = sanitizeText(body?.symbol).toUpperCase();
  const createdAt = sanitizeText(body?.created_at) || new Date().toISOString();
  const category = sanitizeText(body?.category, "meme") || "meme";

  if (!tokenAddress) throw new Error("token_address is required");
  if (!creatorWallet) throw new Error("creator_wallet is required");
  if (!name) throw new Error("name is required");
  if (!symbol) throw new Error("symbol is required");
  if (chain === "solana" && !isSolanaAddress(tokenAddress)) throw new Error("Invalid Solana token address");
  if (chain === "bsc" && !isEvmAddress(tokenAddress)) throw new Error("Invalid BSC token address");
  if (chain === "solana" && !isSolanaAddress(creatorWallet)) throw new Error("Invalid Solana creator wallet");
  if (chain === "bsc" && !isEvmAddress(creatorWallet)) throw new Error("Invalid BSC creator wallet");

  return {
    id: sanitizeText(body?.id) || crypto.randomUUID(),
    token_address: tokenAddress,
    chain,
    creator_wallet: creatorWallet,
    name,
    symbol,
    created_at: createdAt,
    created_via: sanitizeText(body?.created_via, "SaveMeme") || "SaveMeme",
    launch_source: sanitizeText(body?.launch_source, "SaveMeme") || "SaveMeme",
    category,
    timestamp: sanitizeText(body?.timestamp) || createdAt,
    tx_hash: sanitizeText(body?.tx_hash || body?.txHash) || undefined,
    metadata_uri: sanitizeText(body?.metadata_uri || body?.metadataUri) || undefined,
    logo_url: sanitizeText(body?.logo_url || body?.logoUrl) || undefined,
    explorer_url: sanitizeText(body?.explorer_url || body?.explorerUrl) || explorerFor(chain, tokenAddress),
    ai_checked: Boolean(body?.ai_checked ?? body?.aiChecked ?? false),
    ai_scan: body?.ai_scan && typeof body.ai_scan === "object" ? body.ai_scan as Record<string, unknown> : null,
    attributes: body?.attributes && typeof body.attributes === "object" ? body.attributes as Record<string, unknown> : undefined,
    creator_authority: sanitizeText(body?.creator_authority || body?.creatorAuthority) || undefined,
    attribution_program: sanitizeText(body?.attribution_program || body?.attributionProgram) || undefined,
    factory_address: sanitizeText(body?.factory_address || body?.factoryAddress) || undefined,
    verified_source: sanitizeText(body?.verified_source || body?.verifiedSource) || undefined,
    vanity_prefix: sanitizeText(body?.vanity_prefix || body?.vanityPrefix) || undefined,
  };
}

export async function registerMintedBySaveMeme(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const body = await req.json();
    const record = buildRecord(body || {});
    const store = await readStore();
    const next = [
      record,
      ...store.filter((item) => !(item.chain === record.chain && normalizeAddress(item.token_address, item.chain) === record.token_address)),
    ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    await writeStore(next);

    let announcement: Record<string, unknown> | null = null;
    try {
      const queued = await enqueueTokenAnnouncement({
        name: record.name,
        symbol: record.symbol,
        chain: record.chain,
        token_address: record.token_address,
        creator_wallet: record.creator_wallet,
        created_at: record.created_at,
        explorer_link: record.explorer_url || explorerFor(record.chain, record.token_address),
        ai_scan: record.ai_scan,
      });
      announcement = {
        id: queued.id,
        status: queued.status,
        approval_status: queued.approval_status,
        tweet_text: queued.tweet_text,
        validation: queued.validation,
      };
    } catch (queueError) {
      announcement = {
        status: "error",
        error: String((queueError as Error)?.message || queueError || "Failed to enqueue DolphinX X post"),
      };
    }

    return json({ success: true, token: record, announcement, storage: getStorageMode() });
  } catch (error) {
    return json({ error: String((error as Error)?.message || error || "Failed to register SaveMeme mint") }, 400);
  }
}

export async function listMintedBySaveMeme(req: Request): Promise<Response> {
  try {
    if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
    const url = new URL(req.url);
    const chainFilter = normalizeChain(url.searchParams.get("chain") || "");
    const q = sanitizeText(url.searchParams.get("q") || "").toLowerCase();
    const store = await readStore();
    const filtered = store.filter((item) => {
      if (chainFilter && item.chain !== chainFilter) return false;
      if (!q) return true;
      return [item.name, item.symbol, item.token_address, item.creator_wallet].some((value) => String(value || "").toLowerCase().includes(q));
    });
    return json({ success: true, count: filtered.length, tokens: filtered, storage: getStorageMode() });
  } catch (error) {
    return json({ error: String((error as Error)?.message || error || "Failed to list SaveMeme mints") }, 500);
  }
}

export async function getMintedTokenByAddress(address: string): Promise<Response> {
  try {
    const cleanAddress = sanitizeText(address);
    if (!cleanAddress) return json({ error: "Token address is required" }, 400);
    const store = await readStore();
    const match = store.find((item) => normalizeAddress(item.token_address, item.chain) === cleanAddress.toLowerCase() || item.token_address === cleanAddress);
    if (!match) return json({ error: "Token not found" }, 404);
    return json({ success: true, token: match, storage: getStorageMode() });
  } catch (error) {
    return json({ error: String((error as Error)?.message || error || "Failed to load SaveMeme token") }, 500);
  }
}

export async function generateSaveMemeVanity(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const body = await req.json().catch(() => ({}));
    const chain = normalizeChain(body?.chain) || "solana";
    const preferredPrefixes = Array.isArray(body?.prefixes)
      ? body.prefixes.map((item: unknown) => sanitizeText(item)).filter(Boolean)
      : ["save", "meme", "savem"];

    if (chain === "bsc") {
      return json({
        success: true,
        chain,
        supported: false,
        reason: "EVM addresses are hexadecimal, so literal prefixes like 'save' or 'meme' are not possible on BNB Chain.",
        recommendations: [
          "Use CREATE2 with a recognizable salt for the factory deployer.",
          "Use SaveMeme in the contract name, verified source, and emitted TokenCreated event.",
        ],
      });
    }

    return json({
      success: true,
      chain,
      supported: true,
      suggested_prefixes: preferredPrefixes,
      command_hint: preferredPrefixes.map((prefix) => `solana-keygen grind --starts-with ${prefix}:1`).join("\n"),
      note: "Use this for platform-owned program, registry, or admin wallets. Do not require minted token addresses to carry the prefix.",
    });
  } catch (error) {
    return json({ error: String((error as Error)?.message || error || "Failed to build vanity guidance") }, 500);
  }
}
