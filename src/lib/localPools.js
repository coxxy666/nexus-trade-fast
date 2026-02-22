const STORAGE_KEY = 'nexus_liquidity_pools';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listLocalPools() {
  return readAll().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}

export function createLocalPool(pool) {
  const all = readAll();
  const item = {
    id: `local_pool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    ...pool,
  };
  all.push(item);
  writeAll(all);
  return item;
}

export function updateLocalPool(id, patch) {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = {
    ...all[idx],
    ...patch,
    updated_date: new Date().toISOString(),
  };
  writeAll(all);
  return all[idx];
}

