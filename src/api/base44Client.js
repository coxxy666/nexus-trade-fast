const STORAGE_PREFIX = 'nexus_local_entity_';
const USER_KEY = 'nexus_local_user';

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (raw) {
    const parsed = safeJsonParse(raw, null);
    if (parsed?.email) return parsed;
  }

  const user = {
    id: 'local_admin',
    email: 'admin@local.dev',
    role: 'admin',
    name: 'Local Admin',
    created_date: nowIso(),
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

function storageKey(entityName) {
  return `${STORAGE_PREFIX}${entityName}`;
}

function readEntity(entityName) {
  const raw = localStorage.getItem(storageKey(entityName));
  return safeJsonParse(raw, []);
}

function writeEntity(entityName, items) {
  localStorage.setItem(storageKey(entityName), JSON.stringify(items));
}

function sortItems(items, sortSpec = null) {
  if (!sortSpec || typeof sortSpec !== 'string') return items;
  const desc = sortSpec.startsWith('-');
  const key = desc ? sortSpec.slice(1) : sortSpec;
  return [...items].sort((a, b) => {
    const av = a?.[key];
    const bv = b?.[key];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av > bv) return desc ? -1 : 1;
    return desc ? 1 : -1;
  });
}

function filterItems(items, criteria = {}) {
  return items.filter((item) => {
    return Object.entries(criteria).every(([k, v]) => item?.[k] === v);
  });
}

function buildFromSchema(schema) {
  if (!schema || typeof schema !== 'object') return null;

  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    if (schema.enum.includes('medium')) return 'medium';
    if (schema.enum.includes('neutral')) return 'neutral';
    return schema.enum[0];
  }

  switch (schema.type) {
    case 'object': {
      const result = {};
      const props = schema.properties || {};
      for (const [key, propSchema] of Object.entries(props)) {
        result[key] = buildFromSchema(propSchema);
      }
      return result;
    }
    case 'array': {
      const item = buildFromSchema(schema.items || { type: 'string' });
      return item == null ? [] : [item];
    }
    case 'number':
    case 'integer':
      return 50;
    case 'boolean':
      return true;
    case 'string':
    default:
      return 'Generated local response';
  }
}

function tuneLlmResult(result, prompt = '') {
  const text = String(prompt).toLowerCase();

  if (result && typeof result === 'object') {
    if ('risk_level' in result && typeof result.risk_level === 'string') {
      result.risk_level = text.includes('critical') ? 'high' : 'medium';
    }
    if ('overall_rating' in result) {
      result.overall_rating = 'Moderate Risk';
    }
    if ('verification_status' in result) {
      result.verification_status = text.includes('scam') ? 'suspicious' : 'unverified';
    }
    if ('warnings' in result && Array.isArray(result.warnings)) {
      result.warnings = result.warnings.length ? result.warnings : ['Use caution and verify contract details.'];
    }
    if ('key_risks' in result && Array.isArray(result.key_risks)) {
      result.key_risks = result.key_risks.length ? result.key_risks : ['Liquidity can be volatile.'];
    }
    if ('strengths' in result && Array.isArray(result.strengths)) {
      result.strengths = result.strengths.length ? result.strengths : ['Active market interest detected.'];
    }
    if ('advice' in result && typeof result.advice === 'string') {
      result.advice = 'Use position sizing and risk management before entry.';
    }
    if ('analysis_summary' in result && typeof result.analysis_summary === 'string') {
      result.analysis_summary = 'Local AI summary: mixed signals, moderate speculative risk.';
    }
  }

  return result;
}

function apiUrl(path = '/') {
  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  const base = rawBase.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalizedPath;
  return `${base}${normalizedPath}`;
}

const auth = {
  async me() {
    return getStoredUser();
  },
  logout(redirectUrl) {
    localStorage.removeItem(USER_KEY);
    if (redirectUrl) window.location.href = redirectUrl;
  },
  redirectToLogin(redirectUrl) {
    // Local mode: keep user logged in and continue.
    if (redirectUrl) window.location.href = redirectUrl;
  },
};

const entities = new Proxy(
  {},
  {
    get(_target, entityName) {
      const name = String(entityName);
      return {
        async list(sortSpec, limit) {
          const items = readEntity(name);
          const sorted = sortItems(items, sortSpec);
          if (typeof limit === 'number') return sorted.slice(0, limit);
          return sorted;
        },
        async filter(criteria = {}, sortSpec, limit) {
          const items = readEntity(name);
          const filtered = filterItems(items, criteria);
          const sorted = sortItems(filtered, sortSpec);
          if (typeof limit === 'number') return sorted.slice(0, limit);
          return sorted;
        },
        async create(data = {}) {
          const items = readEntity(name);
          const user = getStoredUser();
          const record = {
            id: makeId(),
            created_date: nowIso(),
            updated_date: nowIso(),
            created_by: user.email,
            ...data,
          };
          items.push(record);
          writeEntity(name, items);
          return record;
        },
        async update(id, patch = {}) {
          const items = readEntity(name);
          const idx = items.findIndex((i) => i.id === id);
          if (idx === -1) throw new Error(`${name} record not found`);
          items[idx] = {
            ...items[idx],
            ...patch,
            updated_date: nowIso(),
          };
          writeEntity(name, items);
          return items[idx];
        },
        async delete(id) {
          const items = readEntity(name);
          const next = items.filter((i) => i.id !== id);
          writeEntity(name, next);
          return { success: true };
        },
      };
    },
  }
);

const endpointMap = {
  fetchMemeTokens: { method: 'GET', path: '/api/meme-tokens' },
  fetchMemeTokensProxy: { method: 'GET', path: '/api/meme-tokens-proxy' },
  getAccountBalances: { method: 'POST', path: '/api/balances' },
  monitorTransaction: { method: 'POST', path: '/api/monitor' },
  getSwapQuote: { method: 'POST', path: '/api/swap-quote' },
  executeSwap: { method: 'POST', path: '/api/execute-swap' },
  solanaDexSwap: { method: 'POST', path: '/api/solana-swap' },
  crossChainSwap: { method: 'POST', path: '/api/cross-chain-swap' },
  getRateComparison: { method: 'POST', path: '/api/rate-comparison' },
};

const functions = {
  async invoke(functionName, payload = {}) {
    const route = endpointMap[functionName];
    const method = route?.method || 'POST';
    const path = apiUrl(route?.path || `/api/${functionName}`);
    const options = { method, headers: {} };
    if (method !== 'GET') {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload || {});
    }
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error || `Request failed (${response.status})`;
      throw new Error(message);
    }
    return { data };
  },
};

const integrations = {
  Core: {
    async InvokeLLM({ response_json_schema, prompt }) {
      const raw = buildFromSchema(response_json_schema || { type: 'object' });
      return tuneLlmResult(raw || {}, prompt || '');
    },
  },
};

const appLogs = {
  async logUserInApp(_pageName) {
    return true;
  },
};

export const appClient = {
  auth,
  entities,
  functions,
  integrations,
  appLogs,
};
