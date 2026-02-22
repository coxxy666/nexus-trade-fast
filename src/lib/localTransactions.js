const STORAGE_KEY = 'nexus_swap_transactions';

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

export function listLocalTransactions(limit = 100) {
  const all = readAll().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  return all.slice(0, limit);
}

export function createLocalTransaction(tx) {
  const all = readAll();
  const item = {
    id: `local_tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    ...tx,
  };
  all.push(item);
  writeAll(all);
  return item;
}

export function updateLocalTransaction(id, patch) {
  const all = readAll();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  all[idx] = {
    ...all[idx],
    ...patch,
    updated_date: new Date().toISOString(),
  };
  writeAll(all);
  return all[idx];
}

export function deleteLocalTransaction(id) {
  const all = readAll().filter((t) => t.id !== id);
  writeAll(all);
}

