const CHARGES_FILE = './backend/data/charges.json';

export type SwapCharge = {
  id: string;
  createdAt: string;
  txHash: string;
  chain: string;
  wallet: string;
  tokenFrom: string;
  tokenTo: string;
  amountFrom: number;
  amountTo: number;
  feePercent: number;
  feeAmount: number;
  feeUsd: number;
  status: 'completed' | 'pending' | 'failed';
};

async function ensureStorage() {
  await Deno.mkdir('./backend/data', { recursive: true });
  try {
    await Deno.stat(CHARGES_FILE);
  } catch {
    await Deno.writeTextFile(CHARGES_FILE, '[]');
  }
}

export async function listCharges(): Promise<SwapCharge[]> {
  await ensureStorage();
  const raw = await Deno.readTextFile(CHARGES_FILE);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as SwapCharge[];
}

export async function saveCharges(charges: SwapCharge[]) {
  await ensureStorage();
  await Deno.writeTextFile(CHARGES_FILE, JSON.stringify(charges, null, 2));
}

export async function addCharge(input: Omit<SwapCharge, 'id' | 'createdAt'>): Promise<SwapCharge> {
  const charges = await listCharges();
  const record: SwapCharge = {
    id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  charges.push(record);
  await saveCharges(charges);
  return record;
}

export async function getChargeSummary() {
  const charges = await listCharges();
  const completed = charges.filter((c) => c.status === 'completed');
  const totalFeeUsd = completed.reduce((sum, c) => sum + (Number(c.feeUsd) || 0), 0);
  const totalCount = completed.length;
  const avgFeeUsd = totalCount > 0 ? totalFeeUsd / totalCount : 0;

  return {
    totalCount,
    totalFeeUsd,
    avgFeeUsd,
    lastUpdated: new Date().toISOString(),
  };
}
