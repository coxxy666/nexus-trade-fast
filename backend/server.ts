import { serve } from 'https://deno.land/std/http/server.ts';
import { handleChargeSummary, handleCreateCharge, handleListCharges } from './services/charges.ts';

const HOST = '127.0.0.1';
const PORT = 8001;

function withCors(resp: Response): Response {
  const headers = new Headers(resp.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(resp.body, { status: resp.status, headers });
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }));
  }

  if (req.method === 'GET' && path === '/health') {
    return withCors(Response.json({ ok: true, service: 'backend-charges' }));
  }

  if (req.method === 'GET' && path === '/charges') {
    return withCors(await handleListCharges());
  }

  if (req.method === 'GET' && path === '/charges/summary') {
    return withCors(await handleChargeSummary());
  }

  if (req.method === 'POST' && path === '/charges') {
    return withCors(await handleCreateCharge(req));
  }

  return withCors(Response.json({ error: 'Not found' }, { status: 404 }));
}

console.log(`Backend running at http://${HOST}:${PORT}`);
await serve(handler, { hostname: HOST, port: PORT });
