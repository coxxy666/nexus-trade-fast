import { apiUrl } from '@/lib/apiUrl';
const CORE_PRIORITY = ['SOL', 'BNB', 'ETH'];
const DOLPHIN_PRIORITY_ADDRESS = 'D4cEQyPyc6idbmsgmv4dycFxygyK2DzdUamfWmUuJmt9';

const FALLBACK_TOKENS = [
  {
    symbol: 'SOL',
    name: 'Solana',
    address: 'So11111111111111111111111111111111111111112',
    price_usd: 0,
    price_change_24h: 0,
    volume_24h: 0,
    liquidity: 0,
    market_cap: 0,
    logo_url: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png',
    network: 'solana',
    fdv: 0,
    market_cap_rank: 7,
  },
  {
    symbol: 'BNB',
    name: 'BNB',
    address: '0xbb4CdB9CBd36B01bD1cbaB777c5e04c0334f63C3',
    price_usd: 0,
    price_change_24h: 0,
    volume_24h: 0,
    liquidity: 0,
    market_cap: 0,
    logo_url: 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png',
    network: 'bsc',
    fdv: 0,
    market_cap_rank: 5,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    price_usd: 0,
    price_change_24h: 0,
    volume_24h: 0,
    liquidity: 0,
    market_cap: 0,
    logo_url: 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png',
    network: 'ethereum',
    fdv: 0,
    market_cap_rank: 2,
  },
  {
    symbol: 'DOLPHIN',
    name: 'Dolphin Dolphin Token',
    address: DOLPHIN_PRIORITY_ADDRESS,
    price_usd: 0,
    price_change_24h: 0,
    volume_24h: 0,
    liquidity: 0,
    market_cap: 0,
    logo_url: '/save-meme-logo.png',
    network: 'solana',
    fdv: 0,
    market_cap_rank: 9999,
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    address: '',
    price_usd: 0,
    price_change_24h: 0,
    volume_24h: 0,
    liquidity: 0,
    market_cap: 0,
    logo_url: 'https://assets.coingecko.com/coins/images/5/standard/dogecoin.png',
    network: 'multi-chain',
    fdv: 0,
    market_cap_rank: 10,
  },
  {
    symbol: 'SHIB',
    name: 'Shiba Inu',
    address: '',
    price_usd: 0,
    price_change_24h: 0,
    volume_24h: 0,
    liquidity: 0,
    market_cap: 0,
    logo_url: 'https://assets.coingecko.com/coins/images/11939/standard/shiba.png',
    network: 'multi-chain',
    fdv: 0,
    market_cap_rank: 20,
  },
  {
    symbol: 'PEPE',
    name: 'Pepe',
    address: '',
    price_usd: 0,
    price_change_24h: 0,
    volume_24h: 0,
    liquidity: 0,
    market_cap: 0,
    logo_url: 'https://assets.coingecko.com/coins/images/29850/standard/pepe-token.jpeg',
    network: 'multi-chain',
    fdv: 0,
    market_cap_rank: 50,
  },
];

function normalizeToken(token) {
  const symbol = (token?.symbol || '').toUpperCase();
  return {
    symbol,
    name: token?.name || symbol || 'UNKNOWN',
    address: token?.address || token?.id || '',
    price_usd: Number(token?.price_usd ?? token?.price ?? 0),
    price_change_24h: Number(token?.price_change_24h ?? 0),
    volume_24h: Number(token?.volume_24h ?? 0),
    liquidity: Number(token?.liquidity ?? token?.market_cap ?? 0),
    market_cap: Number(token?.market_cap ?? 0),
    logo_url: token?.logo_url || token?.logo || '',
    network: token?.network || 'multi-chain',
    fdv: Number(token?.fdv ?? 0),
    market_cap_rank: Number(token?.market_cap_rank ?? 9999),
  };
}

function sortTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const aAddr = String(a?.address || '').toLowerCase();
    const bAddr = String(b?.address || '').toLowerCase();
    if (aAddr === DOLPHIN_PRIORITY_ADDRESS.toLowerCase() && bAddr !== DOLPHIN_PRIORITY_ADDRESS.toLowerCase()) return -1;
    if (bAddr === DOLPHIN_PRIORITY_ADDRESS.toLowerCase() && aAddr !== DOLPHIN_PRIORITY_ADDRESS.toLowerCase()) return 1;

    const aIdx = CORE_PRIORITY.indexOf((a.symbol || '').toUpperCase());
    const bIdx = CORE_PRIORITY.indexOf((b.symbol || '').toUpperCase());
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return (Number(b.market_cap) || 0) - (Number(a.market_cap) || 0);
  });
}

function dedupeAndMerge(tokens = []) {
  const isCoreSymbol = (symbol) => CORE_PRIORITY.includes(String(symbol || '').toUpperCase());
  const isCoreCandidate = (token) => {
    const symbol = String(token?.symbol || '').toUpperCase();
    const address = String(token?.address || '');
    if (symbol === 'SOL') return address === 'So11111111111111111111111111111111111111112';
    if (symbol === 'BNB') return /^0x[a-fA-F0-9]{40}$/.test(address);
    if (symbol === 'ETH') return /^0x[a-fA-F0-9]{40}$/.test(address);
    return false;
  };
  const pickBetter = (existing, incoming) => {
    const existingCap = Number(existing?.market_cap || 0);
    const incomingCap = Number(incoming?.market_cap || 0);
    const existingCore = isCoreCandidate(existing);
    const incomingCore = isCoreCandidate(incoming);

    if (incomingCore && !existingCore) return { ...existing, ...incoming };
    if (existingCore && !incomingCore) return { ...incoming, ...existing };
    if (incomingCap > existingCap) return { ...existing, ...incoming };
    return { ...incoming, ...existing };
  };

  const map = new Map();
  for (const token of tokens) {
    const normalized = normalizeToken(token);
    if (!normalized.symbol) continue;
    const key = normalized.symbol;
    if (!map.has(key)) {
      map.set(key, normalized);
    } else {
      map.set(key, pickBetter(map.get(key), normalized));
    }
  }

  for (const fallback of FALLBACK_TOKENS) {
    const normalized = normalizeToken(fallback);
    const key = normalized.symbol;
    if (!map.has(key)) {
      map.set(key, normalized);
      continue;
    }
    if (isCoreSymbol(key)) {
      map.set(key, pickBetter(map.get(key), normalized));
    }
  }

  return sortTokens(Array.from(map.values()));
}

async function fetchViaBackendEndpoint(endpoint) {
  const response = await fetch(apiUrl(endpoint), { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  const payload = await response.json();
  if (Array.isArray(payload.tokens)) return payload.tokens;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export const fetchMemeTokensFromCoinGecko = async () => {
  try {
    const tokens = await fetchViaBackendEndpoint('/api/meme-tokens');
    return dedupeAndMerge(tokens);
  } catch {
    return dedupeAndMerge([]);
  }
};

export const fetchAllMemeTokens = async () => {
  try {
    const tokens = await fetchViaBackendEndpoint('/api/meme-tokens-proxy');
    return dedupeAndMerge(tokens);
  } catch {
    // Fallback to the simpler function if proxy fails.
    return fetchMemeTokensFromCoinGecko();
  }
};

export const fetchMemeTokensFromGeckoTerminal = async () => {
  return fetchAllMemeTokens();
};

export const fetchTokenDetailsByAddress = async (_network, address) => {
  const tokens = await fetchAllMemeTokens();
  const match = tokens.find((t) => (t.address || '').toLowerCase() === (address || '').toLowerCase());
  return match || null;
};

export const fetchTokenPoolInfo = async (_network, _poolAddress) => {
  return null;
};

export const fetchDolphinToken = async () => {
  const poolAddress = 'CVrDsNrKrzQN3u8q9RbE61in7BSQGfRGM9ezL1H2d2fz';
  const poolApi = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}?include=base_token`;

  try {
    const response = await fetch(poolApi, {
      headers: {
        accept: 'application/json',
      },
    });

    if (response.ok) {
      const payload = await response.json();
      const attributes = payload?.data?.attributes || {};
      const included = Array.isArray(payload?.included) ? payload.included : [];
      const baseToken = included.find((item) => item?.type === 'token') || {};
      const tokenAttr = baseToken?.attributes || {};
      const tokenId = String(baseToken?.id || '');
      const tokenAddress = tokenId.startsWith('solana_') ? tokenId.replace('solana_', '') : '';

      return {
        name: tokenAttr?.name || 'Save Meme',
        symbol: tokenAttr?.symbol || 'DOLPHIN',
        address: tokenAddress,
        network: 'solana',
        logo_url: tokenAttr?.image_url || '/save-meme-logo.png',
        price_usd: Number(attributes?.base_token_price_usd || 0),
        market_cap: Number(attributes?.market_cap_usd || attributes?.fdv_usd || 0),
        volume_24h: Number(attributes?.volume_usd?.h24 || 0),
        price_change_24h: Number(attributes?.price_change_percentage?.h24 || 0),
        liquidity: Number(attributes?.reserve_in_usd || 0),
      };
    }
  } catch {
    // Fall through to existing fallback logic below.
  }

  const tokens = await fetchAllMemeTokens();
  const dolphinLike = tokens.find((t) => {
    const name = (t.name || '').toLowerCase();
    const symbol = (t.symbol || '').toLowerCase();
    return name.includes('dolphin') || symbol.includes('dolphin');
  });

  if (dolphinLike) return dolphinLike;

  return {
    name: 'Save Meme',
    symbol: 'DOLPHIN',
    logo_url: '/save-meme-logo.png',
    price_usd: 0,
    market_cap: 0,
    volume_24h: 0,
    price_change_24h: 0,
    liquidity: 0,
  };
};

