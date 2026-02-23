import { serve } from "https://deno.land/std/http/server.ts";

// Import your functions
import { fetchMemeTokens } from "./functions/fetchMemeTokens.ts";
import { fetchMemeTokensProxy } from "./functions/fetchMemeTokensProxy.ts";
import { getSwapQuote } from "./functions/getSwapQuote.ts";
import { executeSwap } from "./functions/executeSwap.ts";
import { getAccountBalances } from "./functions/getAccountBalances.ts";
import { monitorTransaction } from "./functions/monitorTransaction.ts";
import { getRateComparison } from "./functions/getRateComparison.ts";
import { crossChainSwap } from "./functions/crossChainSwap.ts";
import { solanaDexSwap } from "./functions/solanaDexSwap.ts";
import { getTokenSentiment } from "./functions/getTokenSentiment.ts";

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
console.log("=".repeat(50) + "\n");

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

  try {
    // Route to appropriate function
    if (path === "/api/meme-tokens") {
      console.error(" Fetching meme tokens (proxy aggregator)...");
      // Use proxy pipeline to avoid empty results when a single upstream fails.
      return await fetchMemeTokensProxy(req);
    }
    
    if (path === "/api/meme-tokens-proxy") {
      console.error(" Fetching meme tokens via proxy...");
      return await fetchMemeTokensProxy(req);
    }
    
    if (path === "/api/swap-quote") {
      console.error(" Getting swap quote...");
      return await getSwapQuote(req);
    }
    
    if (path === "/api/execute-swap") {
      console.error(" Executing swap...");
      return await executeSwap(req);
    }
    
    if (path === "/api/balances") {
      console.error(" Getting account balances...");
      return await getAccountBalances(req);
    }
    
    if (path === "/api/monitor") {
      console.error(" Monitoring transaction...");
      return await monitorTransaction(req);
    }

    if (path === "/api/rate-comparison") {
      console.error(" Getting rate comparison...");
      return await getRateComparison(req);
    }

    if (path === "/api/cross-chain-swap") {
      console.error(" Getting cross-chain estimate...");
      return await crossChainSwap(req);
    }

    if (path === "/api/solana-swap") {
      console.error(" Getting Solana swap transaction...");
      return await solanaDexSwap(req);
    }

    if (path === "/api/token-sentiment") {
      console.error(" Getting token sentiment and direct quotes...");
      return await getTokenSentiment(req);
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
        "/api/token-sentiment"
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
