import { useQuery } from '@tanstack/react-query';
import { fetchAllMemeTokens } from '@/components/memeai/GeckoTerminalService';

const CORE_PRIORITY = ['SOL', 'BNB', 'ETH'];
const DOLPHIN_PRIORITY_ADDRESS = 'D4cEQyPyc6idbmsgmv4dycFxygyK2DzdUamfWmUuJmt9'.toLowerCase();
const upsertCoreTokens = (tokens = []) => {
  const map = new Map();
  const hasAddress = (token) => {
    const addr = String(token?.address || '').trim();
    return addr.length > 0;
  };
  for (const token of tokens) {
    if (!token?.symbol) continue;
    const key = token.symbol.toUpperCase();
    if (!map.has(key)) {
      map.set(key, token);
      continue;
    }
    const existing = map.get(key);
    const keepIncoming =
      (hasAddress(token) && !hasAddress(existing)) ||
      (Number(token?.market_cap || 0) > Number(existing?.market_cap || 0));
    if (keepIncoming) {
      map.set(key, token);
    }
  }

  for (const fallback of DEFAULT_TOKENS) {
    const key = fallback.symbol.toUpperCase();
    if (!map.has(key)) map.set(key, fallback);
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    const aAddr = String(a?.address || '').toLowerCase();
    const bAddr = String(b?.address || '').toLowerCase();
    if (aAddr === DOLPHIN_PRIORITY_ADDRESS && bAddr !== DOLPHIN_PRIORITY_ADDRESS) return -1;
    if (bAddr === DOLPHIN_PRIORITY_ADDRESS && aAddr !== DOLPHIN_PRIORITY_ADDRESS) return 1;

    const aIdx = CORE_PRIORITY.indexOf((a.symbol || '').toUpperCase());
    const bIdx = CORE_PRIORITY.indexOf((b.symbol || '').toUpperCase());
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return (Number(b.market_cap) || 0) - (Number(a.market_cap) || 0);
  });
  return merged;
};

export const useMemeTokens = () => {
  return useQuery({
    queryKey: ['memeTokens'],
    queryFn: async () => {
      try {
        const tokens = await fetchAllMemeTokens();
        return upsertCoreTokens(Array.isArray(tokens) ? tokens : []);
      } catch (error) {
        console.error('useMemeTokens fallback error:', error);
        return upsertCoreTokens([]);
      }
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 45000,
  });
};

// Fallback default tokens for initial load
export const DEFAULT_TOKENS = [
  {
    symbol: 'DOLPHIN',
    name: 'Dolphin Dolphin Token',
    logo: '/save-meme-logo.png',
    logo_url: '/save-meme-logo.png',
    address: 'D4cEQyPyc6idbmsgmv4dycFxygyK2DzdUamfWmUuJmt9',
    price_usd: 0,
    price_change_24h: 0,
    market_cap: 0,
    network: 'solana',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    logo: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png',
    logo_url: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png',
    address: 'So11111111111111111111111111111111111111112',
    price_usd: 0,
    price_change_24h: 0,
    market_cap: 0,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png',
    logo_url: 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    price_usd: 0,
    price_change_24h: 0,
    market_cap: 0,
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    logo: 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png',
    logo_url: 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png',
    address: '0xbb4CdB9CBd36B01bD1cbaAFc831a141f3A445ff0',
    price_usd: 0,
    price_change_24h: 0,
    market_cap: 0,
  }
];

