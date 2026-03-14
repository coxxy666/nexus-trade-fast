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
import { createToken } from "./functions/createToken.ts";
import { createTokenMetadata, getTokenMetadataById } from "./functions/tokenMetadata.ts";

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
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/create-token`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/solana-rpc`);
console.log(`   - POST http://${HOSTNAME}:${PORT}/api/token-metadata`);
console.log(`   - GET  http://${HOSTNAME}:${PORT}/api/token-metadata/:id`);
console.log("=".repeat(50) + "\n");

const SOLANA_RPC_ENDPOINTS = [
  Deno.env.get("SOLANA_RPC_URL"),
  ...String(Deno.env.get("SOLANA_RPC_FALLBACKS") || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  "https://api.mainnet-beta.solana.com",
].filter(Boolean);

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

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
      // Use proxy pipeline to avoid empty results when a single upstream fails.
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

    if (path === "/api/create-token") {
      console.error(" Building token creation package...");
      return withCors(await createToken(req));
    }

    if (path === "/api/solana-rpc") {
      console.error(" Proxying Solana RPC request...");
      return withCors(await forwardSolanaRpc(req));
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

    // Default response
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
        "/api/create-token",
        "/api/solana-rpc",
        "/api/token-metadata",
        "/api/token-metadata/:id"
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

console.error(` Starting server on ${HOSTNAME}:${PORT}...`);
await serve(handler, { hostname: HOSTNAME, port: PORT });
