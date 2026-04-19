const ANNOUNCEMENT_STORE_PATH = "data/token-announcements.json";
const ANNOUNCEMENT_KV_PREFIX = ["savememe", "token_announcements"] as const;
const KV_ENABLED = ["1", "true", "yes", "on"].includes(String(Deno.env.get("USE_DENO_KV") || "").toLowerCase());
const KV_PATH = String(Deno.env.get("DENO_KV_PATH") || "").trim() || undefined;

const X_API_BASE_URL = "https://api.twitter.com/2";
const MAX_RETRY_ATTEMPTS = Math.max(1, Number(Deno.env.get("DOLPHINX_X_MAX_RETRIES") || "5"));
const RETRY_BASE_MS = Math.max(1000, Number(Deno.env.get("DOLPHINX_X_RETRY_BASE_MS") || "30000"));
const PROCESS_INTERVAL_MS = Math.max(5000, Number(Deno.env.get("DOLPHINX_X_PROCESS_INTERVAL_MS") || "15000"));
const EXPLICIT_ENABLED = ["1", "true", "yes", "on"].includes(String(Deno.env.get("DOLPHINX_X_POSTING_ENABLED") || "").toLowerCase());
const APPROVAL_MODE = ["1", "true", "yes", "on"].includes(String(Deno.env.get("DOLPHINX_X_APPROVAL_MODE") || "").toLowerCase());
const REQUIRE_AI_THRESHOLD = ["1", "true", "yes", "on"].includes(String(Deno.env.get("DOLPHINX_X_REQUIRE_AI_SCORE") || "").toLowerCase());
const AI_SCORE_THRESHOLD = Number(Deno.env.get("DOLPHINX_X_AI_SCORE_THRESHOLD") || "0");
const ADMIN_API_KEY = String(Deno.env.get("DOLPHINX_ADMIN_API_KEY") || "").trim();
const X_CONSUMER_KEY = String(Deno.env.get("DOLPHINX_X_CONSUMER_KEY") || "").trim();
const X_CONSUMER_SECRET = String(Deno.env.get("DOLPHINX_X_CONSUMER_SECRET") || "").trim();
const X_ACCESS_TOKEN = String(Deno.env.get("DOLPHINX_X_ACCESS_TOKEN") || "").trim();
const X_ACCESS_TOKEN_SECRET = String(Deno.env.get("DOLPHINX_X_ACCESS_TOKEN_SECRET") || "").trim();
const X_HANDLE = String(Deno.env.get("DOLPHINX_X_HANDLE") || "DolphinX").trim().replace(/^@/, "");
const HAS_X_CREDENTIALS = !!(X_CONSUMER_KEY && X_CONSUMER_SECRET && X_ACCESS_TOKEN && X_ACCESS_TOKEN_SECRET);
const ENABLED = EXPLICIT_ENABLED || HAS_X_CREDENTIALS;
const BANNED_WORDS = String(Deno.env.get("DOLPHINX_X_BANNED_WORDS") || "scam,rug,terror,nsfw,sex,nazi,hitler")
  .split(",")
  .map((value) => String(value || "").trim().toLowerCase())
  .filter(Boolean);

let kvPromise: Promise<Deno.Kv | null> | null = null;
let workerStarted = false;
let workerTickInFlight = false;

export type TokenAnnouncementRecord = {
  id: string;
  status: "queued" | "pending_approval" | "posted" | "failed" | "skipped" | "rejected";
  created_at: string;
  updated_at: string;
  posted_at?: string;
  next_attempt_at?: string;
  attempts: number;
  last_error?: string;
  approval_required: boolean;
  approval_status: "not_required" | "pending" | "approved" | "rejected";
  token: {
    name: string;
    symbol: string;
    chain: "solana" | "bsc";
    token_address: string;
    creator_wallet: string;
    created_at: string;
    explorer_link: string;
  };
  validation: {
    safe_name: boolean;
    safe_symbol: boolean;
    banned_word_matches: string[];
    ai_score?: number;
    ai_score_threshold?: number;
    ai_score_passed: boolean;
    passed: boolean;
    reasons: string[];
  };
  tweet_text: string;
  x_post_id?: string;
  x_response?: Record<string, unknown>;
  logs: Array<{
    at: string;
    level: "info" | "warn" | "error";
    message: string;
  }>;
};

export type TokenAnnouncementInput = {
  name: string;
  symbol: string;
  chain: "solana" | "bsc";
  token_address: string;
  creator_wallet: string;
  created_at: string;
  explorer_link: string;
  ai_scan?: Record<string, unknown> | null;
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

function hasXCredentials(): boolean {
  return HAS_X_CREDENTIALS;
}

export function getTokenAnnouncementRuntimeStatus() {
  return {
    enabled: ENABLED,
    explicit_enabled: EXPLICIT_ENABLED,
    approval_mode: APPROVAL_MODE,
    handle: X_HANDLE ? `@${X_HANDLE}` : null,
    credentials_present: hasXCredentials(),
    process_interval_ms: PROCESS_INTERVAL_MS,
    max_retry_attempts: MAX_RETRY_ATTEMPTS,
    ai_score_threshold: AI_SCORE_THRESHOLD > 0 ? AI_SCORE_THRESHOLD : null,
    require_ai_score: REQUIRE_AI_THRESHOLD,
    banned_words_configured: BANNED_WORDS.length,
    storage_mode: KV_ENABLED ? "deno-kv" : "json-file",
  };
}

async function getKv(): Promise<Deno.Kv | null> {
  if (!KV_ENABLED) return null;
  if (!kvPromise) {
    kvPromise = Deno.openKv(KV_PATH).catch(() => null);
  }
  return kvPromise;
}

async function readStore(): Promise<TokenAnnouncementRecord[]> {
  const kv = await getKv();
  if (kv) {
    const records: TokenAnnouncementRecord[] = [];
    for await (const entry of kv.list<TokenAnnouncementRecord>({ prefix: [...ANNOUNCEMENT_KV_PREFIX] })) {
      if (entry.value) records.push(entry.value);
    }
    return records.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  try {
    const raw = await Deno.readTextFile(ANNOUNCEMENT_STORE_PATH);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(records: TokenAnnouncementRecord[]): Promise<void> {
  const kv = await getKv();
  if (kv) {
    const existingKeys: Deno.KvKey[] = [];
    for await (const entry of kv.list({ prefix: [...ANNOUNCEMENT_KV_PREFIX] })) {
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
      await kv.set([...ANNOUNCEMENT_KV_PREFIX, record.id], record);
    }
    return;
  }

  await Deno.mkdir("data", { recursive: true });
  await Deno.writeTextFile(ANNOUNCEMENT_STORE_PATH, JSON.stringify(records, null, 2));
}

function appendLog(record: TokenAnnouncementRecord, level: "info" | "warn" | "error", message: string): TokenAnnouncementRecord {
  return {
    ...record,
    updated_at: new Date().toISOString(),
    logs: [
      ...(Array.isArray(record.logs) ? record.logs : []),
      { at: new Date().toISOString(), level, message },
    ].slice(-50),
  };
}

function cleanName(value: string): boolean {
  return /^[a-zA-Z0-9 .,_-]{2,50}$/.test(value);
}

function cleanSymbol(value: string): boolean {
  return /^[A-Z0-9]{2,10}$/.test(value);
}

function collectBannedWordMatches(values: string[]): string[] {
  const haystack = values.join(" ").toLowerCase();
  return BANNED_WORDS.filter((word) => haystack.includes(word));
}

function extractAiSafetyScore(aiScan: Record<string, unknown> | null | undefined): number | undefined {
  if (!aiScan || typeof aiScan !== "object") return undefined;
  const aiScanRecord = aiScan as Record<string, unknown>;
  const nestedAnalysis = aiScanRecord.analysis as Record<string, unknown> | undefined;
  const nestedResult = aiScanRecord.result as Record<string, unknown> | undefined;
  const candidates = [
    aiScanRecord.safety_score,
    aiScanRecord.safetyScore,
    nestedAnalysis?.safety_score,
    nestedAnalysis?.safetyScore,
    nestedResult?.safety_score,
    nestedResult?.safetyScore,
  ];
  for (const candidate of candidates) {
    const num = Number(candidate);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function buildTweetText(input: TokenAnnouncementInput): string {
  const chainLabel = input.chain === "solana" ? "Solana" : "BNB Chain";
  const symbol = String(input.symbol || "").toUpperCase();
  return [
    `New token mint dolphin dex platform(SAVEMEME) at https://dolphinx2.ai/`,
    "",
    `${input.name} ($${symbol})`,
    `Chain: ${chainLabel}`,
    `Explorer: ${input.explorer_link}`,
    "",
    `@${X_HANDLE.replace(/^@/, "")}`,
  ].join("\n").slice(0, 280);
}

function validateAnnouncement(input: TokenAnnouncementInput): TokenAnnouncementRecord["validation"] {
  const safeName = cleanName(input.name);
  const safeSymbol = cleanSymbol(String(input.symbol || "").toUpperCase());
  const bannedWordMatches = collectBannedWordMatches([input.name, input.symbol]);
  const aiScore = extractAiSafetyScore(input.ai_scan);
  const aiScorePassed = AI_SCORE_THRESHOLD > 0
    ? (Number.isFinite(aiScore) ? Number(aiScore) >= AI_SCORE_THRESHOLD : !REQUIRE_AI_THRESHOLD)
    : true;
  const reasons: string[] = [];

  if (!safeName) reasons.push("Token name failed safety validation.");
  if (!safeSymbol) reasons.push("Token symbol failed safety validation.");
  if (bannedWordMatches.length) reasons.push(`Banned words matched: ${bannedWordMatches.join(", ")}`);
  if (AI_SCORE_THRESHOLD > 0 && !aiScorePassed) {
    if (Number.isFinite(aiScore)) {
      reasons.push(`AI safety score ${aiScore} is below threshold ${AI_SCORE_THRESHOLD}.`);
    } else {
      reasons.push("AI safety score is missing.");
    }
  }

  return {
    safe_name: safeName,
    safe_symbol: safeSymbol,
    banned_word_matches: bannedWordMatches,
    ai_score: Number.isFinite(aiScore) ? aiScore : undefined,
    ai_score_threshold: AI_SCORE_THRESHOLD > 0 ? AI_SCORE_THRESHOLD : undefined,
    ai_score_passed: aiScorePassed,
    passed: reasons.length === 0,
    reasons,
  };
}

async function hmacSha1Base64(secret: string, data: string): Promise<string> {
  const keyBytes = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function randomNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildOAuthHeader(method: string, url: string): Promise<string> {
  const nonce = randomNonce();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: X_CONSUMER_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: "1.0",
  };
  const normalizedParams = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(String(value))}`)
    .join("&");
  const signatureBaseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(normalizedParams),
  ].join("&");
  const signingKey = `${percentEncode(X_CONSUMER_SECRET)}&${percentEncode(X_ACCESS_TOKEN_SECRET)}`;
  const signature = await hmacSha1Base64(signingKey, signatureBaseString);
  return "OAuth " + Object.entries({ ...oauthParams, oauth_signature: signature })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}=\"${percentEncode(String(value))}\"`)
    .join(", ");
}

async function postTweet(text: string): Promise<Record<string, unknown>> {
  const url = `${X_API_BASE_URL}/tweets`;
  const bodyText = JSON.stringify({ text });
  const authHeader = await buildOAuthHeader("POST", url);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyText,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`X API post failed with status ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function computeNextAttemptIso(attempts: number): string {
  const delay = RETRY_BASE_MS * Math.max(1, 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + delay).toISOString();
}

export async function enqueueTokenAnnouncement(input: TokenAnnouncementInput): Promise<TokenAnnouncementRecord> {
  const chain = normalizeChain(input.chain);
  if (!chain) throw new Error("Invalid chain for token announcement.");
  const normalizedInput: TokenAnnouncementInput = {
    ...input,
    chain,
    name: sanitizeText(input.name),
    symbol: sanitizeText(input.symbol).toUpperCase(),
    token_address: sanitizeText(input.token_address),
    creator_wallet: sanitizeText(input.creator_wallet),
    created_at: sanitizeText(input.created_at) || new Date().toISOString(),
    explorer_link: sanitizeText(input.explorer_link),
  };

  const validation = validateAnnouncement(normalizedInput);
  const now = new Date().toISOString();
  let status: TokenAnnouncementRecord["status"] = "queued";
  let approvalStatus: TokenAnnouncementRecord["approval_status"] = "not_required";
  const logs: TokenAnnouncementRecord["logs"] = [];

  if (!ENABLED) {
    status = "skipped";
    approvalStatus = "not_required";
    logs.push({ at: now, level: "warn", message: "DolphinX X posting is disabled by configuration." });
  } else if (!hasXCredentials()) {
    status = "failed";
    logs.push({ at: now, level: "error", message: "DolphinX X credentials are missing." });
  } else {
    if (!validation.passed) {
      logs.push({ at: now, level: "warn", message: `Validation warnings ignored for auto-post: ${validation.reasons.join(" ")}` });
    }
    logs.push({ at: now, level: "info", message: "Announcement queued for automatic posting." });
  }

  const record: TokenAnnouncementRecord = {
    id: crypto.randomUUID(),
    status,
    created_at: now,
    updated_at: now,
    posted_at: undefined,
    next_attempt_at: status === "queued" ? now : undefined,
    attempts: 0,
    last_error: status === "failed" ? "DolphinX X credentials are missing." : undefined,
    approval_required: false,
    approval_status: approvalStatus,
    token: {
      name: normalizedInput.name,
      symbol: normalizedInput.symbol,
      chain,
      token_address: normalizedInput.token_address,
      creator_wallet: normalizedInput.creator_wallet,
      created_at: normalizedInput.created_at,
      explorer_link: normalizedInput.explorer_link,
    },
    validation,
    tweet_text: buildTweetText(normalizedInput),
    logs,
  };

  const store = await readStore();
  store.unshift(record);
  await writeStore(store);
  return record;
}

async function processOneRecord(record: TokenAnnouncementRecord): Promise<TokenAnnouncementRecord> {
  let working = appendLog(record, "info", `Posting attempt ${record.attempts + 1} started.`);
  try {
    const payload = await postTweet(record.tweet_text);
    const responseData = payload.data as Record<string, unknown> | undefined;
    const xPostId = sanitizeText(responseData?.id);
    return appendLog({
      ...working,
      status: "posted",
      posted_at: new Date().toISOString(),
      attempts: working.attempts + 1,
      x_post_id: xPostId || undefined,
      x_response: payload,
      last_error: undefined,
      next_attempt_at: undefined,
    }, "info", "Announcement posted to the official DolphinX X account.");
  } catch (error) {
    const message = String((error as Error)?.message || error || "Unknown X posting failure");
    const attempts = working.attempts + 1;
    const exhausted = attempts >= MAX_RETRY_ATTEMPTS;
    return appendLog({
      ...working,
      attempts,
      last_error: message,
      status: exhausted ? "failed" : "queued",
      next_attempt_at: exhausted ? undefined : computeNextAttemptIso(attempts),
    }, exhausted ? "error" : "warn", exhausted ? "Announcement permanently failed after max retries." : "Announcement posting failed; will retry.");
  }
}

export async function processAnnouncementQueueOnce(): Promise<void> {
  if (!ENABLED || workerTickInFlight) return;
  workerTickInFlight = true;
  try {
    const store = await readStore();
    const now = Date.now();
    let changed = false;
    for (let i = 0; i < store.length; i += 1) {
      const record = store[i];
      if (record.status !== "queued") continue;
      if (record.approval_status === "pending") continue;
      const nextAttemptAt = record.next_attempt_at ? Date.parse(record.next_attempt_at) : 0;
      if (Number.isFinite(nextAttemptAt) && nextAttemptAt > now) continue;
      store[i] = await processOneRecord(record);
      changed = true;
      break;
    }
    if (changed) await writeStore(store);
  } finally {
    workerTickInFlight = false;
  }
}

export function startTokenAnnouncementWorker(): void {
  if (!ENABLED || workerStarted) return;
  workerStarted = true;
  setInterval(() => {
    processAnnouncementQueueOnce().catch((error) => {
      console.error("[announcement-worker] queue tick failed", error);
    });
  }, PROCESS_INTERVAL_MS);
}

export async function sendTestTokenAnnouncement(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    assertAdmin(req);
    if (!ENABLED) {
      return json({ error: "X posting is disabled by configuration.", status: getTokenAnnouncementRuntimeStatus() }, 400);
    }
    if (!hasXCredentials()) {
      return json({ error: "DolphinX X credentials are missing.", status: getTokenAnnouncementRuntimeStatus() }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const requestedText = sanitizeText((body as Record<string, unknown>)?.text);
    const text = requestedText || [
      "DolphinX backend posting test",
      "",
      `Handle: @${X_HANDLE}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n").slice(0, 280);

    const response = await postTweet(text);
    return json({ success: true, text, response, status: getTokenAnnouncementRuntimeStatus() });
  } catch (error) {
    const message = String((error as Error)?.message || error || "Failed to send test announcement");
    return json({ error: message, status: getTokenAnnouncementRuntimeStatus() }, message === "Unauthorized" ? 401 : 400);
  }
}

export async function getTokenAnnouncementStatus(req: Request): Promise<Response> {
  try {
    if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
    assertAdmin(req);
    return json({ success: true, status: getTokenAnnouncementRuntimeStatus() });
  } catch (error) {
    const message = String((error as Error)?.message || error || "Failed to read announcement status");
    return json({ error: message }, message === "Unauthorized" ? 401 : 400);
  }
}

export async function listTokenAnnouncements(req: Request): Promise<Response> {
  try {
    if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
    assertAdmin(req);
    const url = new URL(req.url);
    const status = sanitizeText(url.searchParams.get("status"));
    const chain = normalizeChain(url.searchParams.get("chain"));
    const q = sanitizeText(url.searchParams.get("q")).toLowerCase();
    const store = await readStore();
    const filtered = store.filter((item) => {
      if (status && item.status !== status) return false;
      if (chain && item.token.chain !== chain) return false;
      if (!q) return true;
      return [item.token.name, item.token.symbol, item.token.token_address, item.token.creator_wallet]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
    return json({
      success: true,
      count: filtered.length,
      queue: filtered,
      settings: {
        enabled: ENABLED,
    explicit_enabled: EXPLICIT_ENABLED,
        approval_mode: APPROVAL_MODE,
        ai_score_threshold: AI_SCORE_THRESHOLD > 0 ? AI_SCORE_THRESHOLD : null,
        require_ai_score: REQUIRE_AI_THRESHOLD,
      },
      storage: (await getKv()) ? "deno-kv" : "file",
    });
  } catch (error) {
    const message = String((error as Error)?.message || error || "Failed to list announcements");
    return json({ error: message }, message === "Unauthorized" ? 401 : 400);
  }
}

function assertAdmin(req: Request): void {
  if (!ADMIN_API_KEY) throw new Error("DOLPHINX_ADMIN_API_KEY is not configured.");
  const supplied = sanitizeText(req.headers.get("x-admin-key"));
  if (!supplied || supplied !== ADMIN_API_KEY) throw new Error("Unauthorized");
}

async function updateRecord(recordId: string, updater: (record: TokenAnnouncementRecord) => TokenAnnouncementRecord): Promise<TokenAnnouncementRecord | null> {
  const store = await readStore();
  const idx = store.findIndex((item) => item.id === recordId);
  if (idx === -1) return null;
  store[idx] = updater(store[idx]);
  await writeStore(store);
  return store[idx];
}

export async function approveTokenAnnouncement(req: Request, id: string): Promise<Response> {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    assertAdmin(req);
    const updated = await updateRecord(id, (record) => appendLog({
      ...record,
      status: record.status === "posted" ? "posted" : "queued",
      approval_status: "approved",
      next_attempt_at: new Date().toISOString(),
    }, "info", "Announcement approved by admin."));
    if (!updated) return json({ error: "Announcement not found" }, 404);
    return json({ success: true, announcement: updated });
  } catch (error) {
    const message = String((error as Error)?.message || error || "Failed to approve announcement");
    return json({ error: message }, message === "Unauthorized" ? 401 : 400);
  }
}

export async function rejectTokenAnnouncement(req: Request, id: string): Promise<Response> {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    assertAdmin(req);
    const updated = await updateRecord(id, (record) => appendLog({
      ...record,
      status: "rejected",
      approval_status: "rejected",
      next_attempt_at: undefined,
    }, "warn", "Announcement rejected by admin."));
    if (!updated) return json({ error: "Announcement not found" }, 404);
    return json({ success: true, announcement: updated });
  } catch (error) {
    const message = String((error as Error)?.message || error || "Failed to reject announcement");
    return json({ error: message }, message === "Unauthorized" ? 401 : 400);
  }
}

export async function retryTokenAnnouncement(req: Request, id: string): Promise<Response> {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    assertAdmin(req);
    const updated = await updateRecord(id, (record) => appendLog({
      ...record,
      status: "queued",
      next_attempt_at: new Date().toISOString(),
      last_error: undefined,
      approval_status: record.approval_required
        ? (record.approval_status === "approved" ? "approved" : "pending")
        : "not_required",
    }, "info", "Announcement manually re-queued by admin."));
    if (!updated) return json({ error: "Announcement not found" }, 404);
    return json({ success: true, announcement: updated });
  } catch (error) {
    const message = String((error as Error)?.message || error || "Failed to retry announcement");
    return json({ error: message }, message === "Unauthorized" ? 401 : 400);
  }
}



