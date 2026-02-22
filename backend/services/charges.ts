import { addCharge, getChargeSummary, listCharges, type SwapCharge } from '../storage/chargeStore.ts';

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function validatePayload(payload: any): Omit<SwapCharge, 'id' | 'createdAt'> {
  const txHash = String(payload?.txHash || '').trim();
  const chain = String(payload?.chain || '').trim();
  const wallet = String(payload?.wallet || '').trim();
  const tokenFrom = String(payload?.tokenFrom || '').trim();
  const tokenTo = String(payload?.tokenTo || '').trim();
  const statusRaw = String(payload?.status || 'completed').toLowerCase();
  const status = statusRaw === 'pending' || statusRaw === 'failed' ? statusRaw : 'completed';

  if (!txHash || !chain || !wallet || !tokenFrom || !tokenTo) {
    throw new Error('Missing required fields: txHash, chain, wallet, tokenFrom, tokenTo');
  }

  return {
    txHash,
    chain,
    wallet,
    tokenFrom,
    tokenTo,
    amountFrom: toNumber(payload?.amountFrom),
    amountTo: toNumber(payload?.amountTo),
    feePercent: toNumber(payload?.feePercent),
    feeAmount: toNumber(payload?.feeAmount),
    feeUsd: toNumber(payload?.feeUsd),
    status,
  };
}

export async function handleCreateCharge(req: Request): Promise<Response> {
  try {
    const payload = await req.json();
    const validated = validatePayload(payload);
    const record = await addCharge(validated);
    return Response.json({ success: true, charge: record });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

export async function handleListCharges(): Promise<Response> {
  const charges = await listCharges();
  return Response.json({ success: true, charges });
}

export async function handleChargeSummary(): Promise<Response> {
  const summary = await getChargeSummary();
  return Response.json({ success: true, summary });
}
