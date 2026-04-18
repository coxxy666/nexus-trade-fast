
import "./loadEnv.ts";
import { serve } from "https://deno.land/std/http/server.ts";

// Import your functions
import { fetchMemeTokensProxy } from "./functions/fetchMemeTokensProxy.ts";
import { getSwapQuote } from "./functions/getSwapQuote.ts";
import { executeSwap } from "./functions/executeSwap.ts";
import { getAccountBalances } from "./functions/getAccountBalances.ts";
import { monitorTransaction } from "./functions/monitorTransaction.ts";
import { getRateComparison } from "./functions/getRateComparison.ts";
import { crossChainSwap } from "./functions/crossChainSwap.ts";
import { solanaDexSwap } from "./functions/solanaDexSwap.ts";
import { getTokenSentiment } from "./functions/getTokenSentiment.ts";
import { getTokenOnchainAnalysis } from "./functions/getTokenOnchainAnalysis.ts";
import { createToken } from "./functions/createToken.ts";
import { createTokenMetadata, getTokenMetadataById } from "./functions/tokenMetadata.ts";
import { generateSaveMemeVanity, getMintedTokenByAddress, listMintedBySaveMeme, registerMintedBySaveMeme } from "./functions/saveMemeRegistry.ts";
import { approveTokenAnnouncement, getTokenAnnouncementRuntimeStatus, getTokenAnnouncementStatus, listTokenAnnouncements, rejectTokenAnnouncement, retryTokenAnnouncement, sendTestTokenAnnouncement, startTokenAnnouncementWorker } from "./functions/tokenAnnouncementQueue.ts";

const PORT = Number(Deno.env.get("PORT") || "8000");
const HOSTNAME = Deno.env.get("HOST") || "0.0.0.0";

console.log("\n" + "=".repeat(50));
console.log(" Deno API server starting...");
console.log("=".repeat(50));
console.log(` Server address: http://${HOSTNAME}:${PORT}`);
console.log("=".repeat(50));
console.log(" Available endpoints:");
console.log(`   - GET  http://${HOSTNAME}:${PORT}/`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/meme-tokens`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/meme-tokens-proxy`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/swap-quote`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/execute-swap`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/balances`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/monitor`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/rate-comparison`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/cross-chain-swap`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/solana-swap`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/token-sentiment`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/token-onchain-analysis`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/create-token`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/coinmarketcap/listing`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/coinmarketcap/historical`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/coingecko/meme-markets`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/coingecko/coin`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/coingecko/market-chart`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/geckoterminal/token-pools`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/geckoterminal/pool-ohlcv`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/geckoterminal/pool`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/solana-rpc`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/token-metadata`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/tokens/register-savememe-mint`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/tokens/minted-by-savememe`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/tokens/:address`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/tokens/vanity-wallet`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/token-metadata/:id`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/admin/x-posts`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/admin/x-posts/status`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/admin/x-posts/test`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/admin/x-posts/:id/approve`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/admin/x-posts/:id/reject`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/admin/x-posts/:id/retry`);
console.log("=".repeat(50) + "\n");

const announcementStatus = getTokenAnnouncementRuntimeStatus();
console.log(" X posting status:");
console.log(`   - enabled: ${announcementStatus.enabled ? "yes" : "no"}`);
console.log(`   - enable source: ${announcementStatus.explicit_enabled ? "env flag" : (announcementStatus.credentials_present ? "auto from credentials" : "disabled")}`);
console.log(`   - approval mode: ${announcementStatus.approval_mode ? "on" : "off"}`);
console.log(`   - handle: ${announcementStatus.handle || "not set"}`);
console.log(`   - credentials present: ${announcementStatus.credentials_present ? "yes" : "no"}`);
console.log(`   - storage: ${announcementStatus.storage_mode}`);
console.log(`   - worker interval: ${announcementStatus.process_interval_ms}ms`);
console.log("=".repeat(50));
if (!announcementStatus.enabled) {
  console.log(" X posting is disabled. Add valid DolphinX X credentials or set DOLPHINX_X_POSTING_ENABLED=true to auto-post minted tokens.");
}
if (announcementStatus.enabled && !announcementStatus.credentials_present) {
  console.log(" X posting is enabled but credentials are missing. Set the DolphinX X API env vars before expecting posts.");
}
console.log("=".repeat(50) + "\n");

const SOLANA_RPC_ENDPOINTS = [
  Deno.env.get("SOLANA_RPC_URL"),
  ...String(Deno.env.get("SOLANA_RPC_FALLBACKS") || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  "https://api.mainnet-beta.solana.com",
].filter(Boolean);
const COINMARKETCAP_LISTING_URL =
  "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing?start=1&limit=5000&sortBy=market_cap&sortType=desc&convert=USD&cryptoType=all&tagType=all&audited=false&aux=ath,atl,high24h,low24h,num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply,volume_7d,volume_30d";
const COINGECKO_MEME_MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets";
const COINGECKO_MEME_CACHE_TTL_MS = 10 * 60 * 1000;
const coingeckoMemeCache = new Map<string, { body: string; contentType: string; status: number; ts: number }>();
const coingeckoCoinCache = new Map<string, { body: string; contentType: string; status: number; ts: number }>();
const coingeckoMarketChartCache = new Map<string, { body: string; contentType: string; status: number; ts: number }>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function forwardCoinMarketCap(req: Request, path: string): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  let upstreamUrl = COINMARKETCAP_LISTING_URL;

  if (path === "/api/coinmarketcap/historical") {
    const id = url.searchParams.get("id") || "";
    const convertId = url.searchParams.get("convertId") || "2781";
    const timeStart = url.searchParams.get("timeStart") || "";
    const timeEnd = url.searchParams.get("timeEnd") || "";
    if (!id || !timeStart || !timeEnd) {
      return new Response(JSON.stringify({ error: "id, timeStart, and timeEnd are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    upstreamUrl = `https://api.coinmarketcap.com/data-api/v3/cryptocurrency/historical?id=${encodeURIComponent(id)}&convertId=${encodeURIComponent(convertId)}&timeStart=${encodeURIComponent(timeStart)}&timeEnd=${encodeURIComponent(timeEnd)}`;
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error?.message || error || "CoinMarketCap proxy failed") }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function forwardCoinGecko(req: Request, path: string): Promise<Response> {
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const now = Date.now();
  let cacheKey = '';
  let cached = null as null | { body: string; contentType: string; status: number; ts: number };
  let upstreamUrl = '';

  if (path === "/api/coingecko/meme-markets") {
    const page = Math.min(Math.max(Number(url.searchParams.get("page") || "1"), 1), 10);
    const perPage = Math.min(Math.max(Number(url.searchParams.get("per_page") || "250"), 1), 250);
    const vsCurrency = String(url.searchParams.get("vs_currency") || "usd").trim().toLowerCase() || "usd";
    cacheKey = `${vsCurrency}:${page}:${perPage}`;
    cached = coingeckoMemeCache.get(cacheKey) || null;
    if (cached && now - cached.ts < COINGECKO_MEME_CACHE_TTL_MS) {
      return new Response(cached.body, {
        status: cached.status,
        headers: { "Content-Type": cached.contentType, "X-Cache": "HIT" },
      });
    }
    upstreamUrl = `${COINGECKO_MEME_MARKETS_URL}?vs_currency=${encodeURIComponent(vsCurrency)}&category=${encodeURIComponent("meme-token")}&order=${encodeURIComponent("market_cap_desc")}&per_page=${encodeURIComponent(String(perPage))}&page=${encodeURIComponent(String(page))}&sparkline=false&price_change_percentage=24h`;
  } else if (path === "/api/coingecko/coin") {
    const id = String(url.searchParams.get("id") || '').trim();
    if (!id) {
      return jsonResponse({ error: "id is required" }, 400);
    }
    cacheKey = id.toLowerCase();
    cached = coingeckoCoinCache.get(cacheKey) || null;
    if (cached && now - cached.ts < COINGECKO_MEME_CACHE_TTL_MS) {
      return new Response(cached.body, {
        status: cached.status,
        headers: { "Content-Type": cached.contentType, "X-Cache": "HIT" },
      });
    }
    upstreamUrl = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=false&sparkline=false`;
  } else if (path === "/api/coingecko/market-chart") {
    const id = String(url.searchParams.get("id") || "").trim();
    const vsCurrency = String(url.searchParams.get("vs_currency") || "usd").trim().toLowerCase() || "usd";
    const days = Math.min(Math.max(Number(url.searchParams.get("days") || "90"), 1), 365);
    if (!id) {
      return jsonResponse({ error: "id is required" }, 400);
    }
    cacheKey = `${id.toLowerCase()}:${vsCurrency}:${days}`;
    cached = coingeckoMarketChartCache.get(cacheKey) || null;
    if (cached && now - cached.ts < COINGECKO_MEME_CACHE_TTL_MS) {
      return new Response(cached.body, {
        status: cached.status,
        headers: { "Content-Type": cached.contentType, "X-Cache": "HIT" },
      });
    }
    upstreamUrl = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${encodeURIComponent(vsCurrency)}&days=${encodeURIComponent(String(days))}&interval=daily`;
  } else {
    return jsonResponse({ error: "Unknown CoinGecko route" }, 404);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    const body = await upstream.text();
    const contentType = upstream.headers.get("Content-Type") || "application/json";

    if (upstream.ok) {
      const cacheStore = path === "/api/coingecko/coin" ? coingeckoCoinCache : path === "/api/coingecko/market-chart" ? coingeckoMarketChartCache : coingeckoMemeCache;
      cacheStore.set(cacheKey, {
        body,
        contentType,
        status: upstream.status,
        ts: now,
      });
      return new Response(body, {
        status: upstream.status,
        headers: { "Content-Type": contentType, "X-Cache": "MISS" },
      });
    }

    if (upstream.status === 429 && cached) {
      return new Response(cached.body, {
        status: cached.status,
        headers: { "Content-Type": cached.contentType, "X-Cache": "STALE", "X-Upstream-Status": "429" },
      });
    }

    return new Response(body, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    if (cached) {
      return new Response(cached.body, {
        status: cached.status,
        headers: { "Content-Type": cached.contentType, "X-Cache": "STALE", "X-Upstream-Status": "FETCH_ERROR" },
      });
    }
    return jsonResponse({ error: String(error?.message || error || "CoinGecko proxy failed") }, 502);
  }
}

async function forwardGeckoTerminal(req: Request, path: string): Promise<Response> {
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const network = String(url.searchParams.get("network") || "").trim().toLowerCase();
  if (!network) {
    return jsonResponse({ error: "network is required" }, 400);
  }

  let upstreamUrl = "";
  if (path === "/api/geckoterminal/token-pools") {
    const address = String(url.searchParams.get("address") || "").trim();
    if (!address) {
      return jsonResponse({ error: "address is required" }, 400);
    }
    upstreamUrl = `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(network)}/tokens/${encodeURIComponent(address)}/pools?sort=h24_volume_usd_liquidity_desc&page=1`;
  } else if (path === "/api/geckoterminal/pool-ohlcv") {
    const poolAddress = String(url.searchParams.get("poolAddress") || "").trim();
    const tokenAddress = String(url.searchParams.get("tokenAddress") || "").trim();
    const days = Math.min(Math.max(Number(url.searchParams.get("days") || "90"), 1), 180);
    if (!poolAddress || !tokenAddress) {
      return jsonResponse({ error: "poolAddress and tokenAddress are required" }, 400);
    }
    upstreamUrl = `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(network)}/pools/${encodeURIComponent(poolAddress)}/ohlcv/day?aggregate=1&limit=${encodeURIComponent(String(days))}&currency=usd&token=${encodeURIComponent(tokenAddress)}`;
  } else if (path === "/api/geckoterminal/pool") {
    const poolAddress = String(url.searchParams.get("poolAddress") || "").trim();
    if (!poolAddress) {
      return jsonResponse({ error: "poolAddress is required" }, 400);
    }
    upstreamUrl = `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(network)}/pools/${encodeURIComponent(poolAddress)}?include=base_token`;
  } else {
    return jsonResponse({ error: "Unknown GeckoTerminal route" }, 404);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
    });
  } catch (error) {
    return jsonResponse({ error: String(error?.message || error || "GeckoTerminal proxy failed") }, 502);
  }
}

async function forwardSolanaRpc(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bodyText = await req.text();
  let lastError = "No Solana RPC endpoint available";

  for (const rpcUrl of SOLANA_RPC_ENDPOINTS) {
    try {
      const upstream = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyText,
      });

      const responseText = await upstream.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = null;
      }

      const isForbiddenJsonRpc =
        parsed &&
        typeof parsed === "object" &&
        parsed.error &&
        (Number(parsed.error.code) === 403 ||
          String(parsed.error.message || "").toLowerCase().includes("forbidden"));

      if (upstream.status === 403 || isForbiddenJsonRpc) {
        lastError = `Forbidden by ${rpcUrl}`;
        continue;
      }

      if (!upstream.ok) {
        lastError = `RPC ${rpcUrl} failed with status ${upstream.status}`;
        continue;
      }

      return new Response(responseText, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      lastError = String(error?.message || error);
    }
  }

  return new Response(JSON.stringify({ error: lastError }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  console.error(`[${new Date().toISOString()}] ${req.method} ${path}`);

  const requestedHeaders = req.headers.get("Access-Control-Request-Headers") || "Content-Type";

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": requestedHeaders,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const withCors = (res: Response) => {
    const mergedHeaders = new Headers(res.headers);
    Object.entries(headers).forEach(([key, value]) => mergedHeaders.set(key, value));
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: mergedHeaders,
    });
  };

  try {
    // Route to appropriate function
    if (path === "/api/meme-tokens") {
      console.error(" Fetching meme tokens (proxy aggregator)...");
      return withCors(await fetchMemeTokensProxy(req));
    }

    if (path === "/api/meme-tokens-proxy") {
      console.error(" Fetching meme tokens via proxy...");
      return withCors(await fetchMemeTokensProxy(req));
    }

    if (path === "/api/swap-quote") {
      console.error(" Getting swap quote...");
      return withCors(await getSwapQuote(req));
    }

    if (path === "/api/execute-swap") {
      console.error(" Executing swap...");
      return withCors(await executeSwap(req));
    }

    if (path === "/api/balances") {
      console.error(" Getting account balances...");
      return withCors(await getAccountBalances(req));
    }

    if (path === "/api/monitor") {
      console.error(" Monitoring transaction...");
      return withCors(await monitorTransaction(req));
    }

    if (path === "/api/rate-comparison") {
      console.error(" Getting rate comparison...");
      return withCors(await getRateComparison(req));
    }

    if (path === "/api/cross-chain-swap") {
      console.error(" Getting cross-chain estimate...");
      return withCors(await crossChainSwap(req));
    }

    if (path === "/api/solana-swap") {
      console.error(" Getting Solana swap transaction...");
      return withCors(await solanaDexSwap(req));
    }

    if (path === "/api/token-sentiment") {
      console.error(" Getting token sentiment and direct quotes...");
      return withCors(await getTokenSentiment(req));
    }

    if (path === "/api/token-onchain-analysis") {
      console.error(" Running onchain token analysis...");
      return withCors(await getTokenOnchainAnalysis(req));
    }

    if (path === "/api/create-token") {
      console.error(" Building token creation package...");
      return withCors(await createToken(req));
    }

    if (path === "/api/coinmarketcap/listing" || path === "/api/coinmarketcap/historical") {
      console.error(" Proxying CoinMarketCap request...");
      return withCors(await forwardCoinMarketCap(req, path));
    }

    if (path === "/api/coingecko/meme-markets" || path === "/api/coingecko/coin" || path === "/api/coingecko/market-chart") {
      console.error(" Proxying CoinGecko request...");
      return withCors(await forwardCoinGecko(req, path));
    }

    if (
      path === "/api/geckoterminal/token-pools" ||
      path === "/api/geckoterminal/pool-ohlcv" ||
      path === "/api/geckoterminal/pool"
    ) {
      console.error(" Proxying GeckoTerminal request...");
      return withCors(await forwardGeckoTerminal(req, path));
    }

    if (path === "/api/solana-rpc") {
      console.error(" Proxying Solana RPC request...");
      return withCors(await forwardSolanaRpc(req));
    }

    if (path === "/api/tokens/register-savememe-mint") {
      console.error(" Registering SaveMeme minted token...");
      return withCors(await registerMintedBySaveMeme(req));
    }

    if (path === "/api/tokens/minted-by-savememe") {
      console.error(" Listing SaveMeme minted tokens...");
      return withCors(await listMintedBySaveMeme(req));
    }

    if (path === "/api/tokens/vanity-wallet") {
      console.error(" Building SaveMeme vanity wallet guidance...");
      return withCors(await generateSaveMemeVanity(req));
    }

    if (path.startsWith("/api/tokens/")) {
      const address = decodeURIComponent(path.replace("/api/tokens/", ""));
      if (address && address !== "minted-by-savememe" && address !== "register-savememe-mint" && address !== "vanity-wallet") {
        console.error(` Reading SaveMeme token registry entry: ${address}`);
        return withCors(await getMintedTokenByAddress(address));
      }
    }

    if (path === "/api/admin/x-posts") {
      console.error(" Listing DolphinX X post queue...");
      return withCors(await listTokenAnnouncements(req));
    }

    if (path === "/api/admin/x-posts/status") {
      console.error(" Reading DolphinX X runtime status...");
      return withCors(await getTokenAnnouncementStatus(req));
    }

    if (path === "/api/admin/x-posts/test") {
      console.error(" Sending DolphinX X test post...");
      return withCors(await sendTestTokenAnnouncement(req));
    }

    if (path.startsWith("/api/admin/x-posts/")) {
      const match = path.match(/^\/api\/admin\/x-posts\/([^/]+)\/(approve|reject|retry)$/);
      if (match) {
        const [, id, action] = match;
        console.error(` Updating DolphinX X queue item ${id}: ${action}`);
        if (action === "approve") return withCors(await approveTokenAnnouncement(req, id));
        if (action === "reject") return withCors(await rejectTokenAnnouncement(req, id));
        if (action === "retry") return withCors(await retryTokenAnnouncement(req, id));
      }
    }

    if (path === "/api/token-metadata") {
      console.error(" Creating token metadata...");
      return withCors(await createTokenMetadata(req));
    }

    if (path.startsWith("/api/token-metadata/")) {
      const id = decodeURIComponent(path.replace("/api/token-metadata/", ""));
      console.error(` Reading token metadata: ${id}`);
      return withCors(await getTokenMetadataById(id));
    }

    return new Response(JSON.stringify({
      status: "ok",
      endpoints: [
        "/api/meme-tokens",
        "/api/meme-tokens-proxy",
        "/api/swap-quote",
        "/api/execute-swap",
        "/api/balances",
        "/api/monitor",
        "/api/rate-comparison",
        "/api/cross-chain-swap",
        "/api/solana-swap",
        "/api/token-sentiment",
        "/api/token-onchain-analysis",
        "/api/create-token",
        "/api/coinmarketcap/listing",
        "/api/coinmarketcap/historical",
        "/api/coingecko/meme-markets",
        "/api/coingecko/coin",
        "/api/coingecko/market-chart",
        "/api/geckoterminal/token-pools",
        "/api/geckoterminal/pool-ohlcv",
        "/api/geckoterminal/pool",
        "/api/solana-rpc",
        "/api/token-metadata",
        "/api/tokens/register-savememe-mint",
        "/api/tokens/minted-by-savememe",
        "/api/tokens/:address",
        "/api/tokens/vanity-wallet",
        "/api/token-metadata/:id",
        "/api/admin/x-posts",
        "/api/admin/x-posts/status",
        "/api/admin/x-posts/test",
        "/api/admin/x-posts/:id/approve",
        "/api/admin/x-posts/:id/reject",
        "/api/admin/x-posts/:id/retry"
      ]
    }), { headers });

  } catch (error) {
    console.error(" Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

startTokenAnnouncementWorker();
console.error(` Starting server on ${HOSTNAME}:${PORT}...`);
await serve(handler, { hostname: HOSTNAME, port: PORT });






