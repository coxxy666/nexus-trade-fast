const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINMARKETCAP_API =
  'https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing';
const TOKEN_CACHE_FILE = './data/token-cache.json';
const CORE_PRIORITY = ['SOL', 'BNB', 'ETH'];

const ADDITIONAL_MEME_TOKENS = [
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    address: '',
    price_usd: 0,
    price_change_24h: 0,
    volume_24h: 0,
    liquidity: 0,
    market_cap: 0,
    logo_url: 'https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png',
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
    logo_url: 'https://coin-images.coingecko.com/coins/images/11939/large/shiba.png',
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
    logo_url: 'https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg',
    network: 'multi-chain',
    fdv: 0,
    market_cap_rank: 30,
  },
];

let LAST_SUCCESS_TOKENS: any[] = [];
let PLATFORM_LIST_CACHE: any[] | null = null;
let PLATFORM_LIST_CACHE_TS = 0;
const PLATFORM_LIST_TTL_MS = 10 * 60 * 1000;

const retryFetch = async (url: string, maxRetries = 2, delayMs = 500) => {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
};

const isSolanaAddress = (addr: string) =>
  !!addr && !addr.startsWith('0x') && addr.length >= 32 && addr.length <= 44;

const isEvmAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr || '');

const normalizeText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const pickBestPlatformAddress = (platforms: any = {}) => {
  const sol = String(platforms?.solana || '').trim();
  const bsc = String(platforms?.binance_smart_chain || '').trim();
  const eth = String(platforms?.ethereum || '').trim();

  if (isSolanaAddress(sol)) return { address: sol, network: 'solana' };
  if (isEvmAddress(bsc)) return { address: bsc, network: 'bsc' };
  if (isEvmAddress(eth)) return { address: eth, network: 'ethereum' };
  return { address: '', network: 'multi-chain' };
};

const inferNetworkFromCmcPlatform = (platform: any, address: string) => {
  const blob = JSON.stringify(platform || {}).toLowerCase();
  if (blob.includes('solana')) return 'solana';
  if (blob.includes('binance') || blob.includes('bsc') || blob.includes('bnb')) return 'bsc';
  if (blob.includes('ethereum') || blob.includes('erc20') || blob.includes('eth')) return 'ethereum';
  if (isSolanaAddress(address)) return 'solana';
  if (isEvmAddress(address)) return 'multi-chain';
  return 'multi-chain';
};

const mergeTokenFields = (existing: any = {}, incoming: any = {}) => {
  const address = incoming.address || existing.address || '';
  const existingNetwork = String(existing.network || '').toLowerCase();
  const incomingNetwork = String(incoming.network || '').toLowerCase();
  const network =
    existingNetwork && existingNetwork !== 'multi-chain' && incomingNetwork === 'multi-chain'
      ? existingNetwork
      : incomingNetwork || existingNetwork || (isSolanaAddress(address) ? 'solana' : 'multi-chain');

  const numberOr = (a: any, b: any) => {
    const first = Number(a) || 0;
    const second = Number(b) || 0;
    return first > 0 ? first : second;
  };

  return {
    ...existing,
    ...incoming,
    address,
    network,
    price_usd: numberOr(incoming.price_usd, existing.price_usd),
    price_change_24h: numberOr(incoming.price_change_24h, existing.price_change_24h),
    volume_24h: numberOr(incoming.volume_24h, existing.volume_24h),
    liquidity: numberOr(incoming.liquidity, existing.liquidity),
    market_cap: numberOr(incoming.market_cap, existing.market_cap),
    fdv: numberOr(incoming.fdv, existing.fdv),
    market_cap_rank: Math.min(
      Number(incoming.market_cap_rank) || 9999,
      Number(existing.market_cap_rank) || 9999
    ),
  };
};

const sortTokens = (tokens: any[]) => {
  return [...tokens].sort((a, b) => {
    const aIdx = CORE_PRIORITY.indexOf((a.symbol || '').toUpperCase());
    const bIdx = CORE_PRIORITY.indexOf((b.symbol || '').toUpperCase());
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return (Number(b.market_cap) || 0) - (Number(a.market_cap) || 0);
  });
};

const fetchCoreBaseTokens = async () => {
  try {
    const response = await retryFetch(
      `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&ids=solana,binancecoin,ethereum&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid CoinGecko core response');

    return data.map((coin: any) => {
      const id = String(coin.id || '');
      const symbol = (coin.symbol || '').toUpperCase();
      const baseAddress =
        id === 'solana'
          ? 'So11111111111111111111111111111111111111112'
          : id === 'binancecoin'
            ? '0xbb4CdB9CBd36B01bD1cbaB777c5e04c0334f63C3'
            : '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const network =
        id === 'solana' ? 'solana' : id === 'binancecoin' ? 'bsc' : 'ethereum';

      return {
        symbol,
        name: coin.name || symbol,
        address: baseAddress,
        price_usd: Number(coin.current_price) || 0,
        price_change_24h: Number(coin.price_change_percentage_24h) || 0,
        volume_24h: Number(coin.total_volume) || 0,
        liquidity: Number(coin.market_cap) || 0,
        market_cap: Number(coin.market_cap) || 0,
        logo_url: coin.image || '',
        network,
        fdv: Number(coin.fully_diluted_valuation) || 0,
        market_cap_rank: Number(coin.market_cap_rank) || 9999,
      };
    });
  } catch {
    try {
      const simplePriceUrl = new URL(`${COINGECKO_BASE_URL}/simple/price`);
      simplePriceUrl.searchParams.set('ids', 'solana,binancecoin,ethereum');
      simplePriceUrl.searchParams.set('vs_currencies', 'usd');
      simplePriceUrl.searchParams.set('include_market_cap', 'true');
      simplePriceUrl.searchParams.set('include_24hr_change', 'true');
      simplePriceUrl.searchParams.set('include_24hr_vol', 'true');

      const response = await retryFetch(simplePriceUrl.toString());
      const data = await response.json();

      const sol = data?.solana || {};
      const bnb = data?.binancecoin || {};
      const eth = data?.ethereum || {};

      return [
        {
          symbol: 'SOL',
          name: 'Solana',
          address: 'So11111111111111111111111111111111111111112',
          price_usd: Number(sol.usd) || 0,
          price_change_24h: Number(sol.usd_24h_change) || 0,
          volume_24h: Number(sol.usd_24h_vol) || 0,
          liquidity: Number(sol.usd_market_cap) || 0,
          market_cap: Number(sol.usd_market_cap) || 0,
          logo_url: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png',
          network: 'solana',
          fdv: Number(sol.usd_market_cap) || 0,
          market_cap_rank: 7,
        },
        {
          symbol: 'BNB',
          name: 'BNB',
          address: '0xbb4CdB9CBd36B01bD1cbaB777c5e04c0334f63C3',
          price_usd: Number(bnb.usd) || 0,
          price_change_24h: Number(bnb.usd_24h_change) || 0,
          volume_24h: Number(bnb.usd_24h_vol) || 0,
          liquidity: Number(bnb.usd_market_cap) || 0,
          market_cap: Number(bnb.usd_market_cap) || 0,
          logo_url: 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png',
          network: 'bsc',
          fdv: Number(bnb.usd_market_cap) || 0,
          market_cap_rank: 5,
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          price_usd: Number(eth.usd) || 0,
          price_change_24h: Number(eth.usd_24h_change) || 0,
          volume_24h: Number(eth.usd_24h_vol) || 0,
          liquidity: Number(eth.usd_market_cap) || 0,
          market_cap: Number(eth.usd_market_cap) || 0,
          logo_url: 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png',
          network: 'ethereum',
          fdv: Number(eth.usd_market_cap) || 0,
          market_cap_rank: 2,
        },
      ];
    } catch {
    const [solTicker, bnbTicker, ethTicker] = await Promise.allSettled([
      retryFetch('https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT').then((r) => r.json()),
      retryFetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BNBUSDT').then((r) => r.json()),
      retryFetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT').then((r) => r.json()),
    ]);

    const extract = (result: any) =>
      result?.status === 'fulfilled'
        ? {
            price: Number(result.value?.lastPrice) || 0,
            change: Number(result.value?.priceChangePercent) || 0,
            volume: Number(result.value?.quoteVolume) || 0,
          }
        : { price: 0, change: 0, volume: 0 };

    const sol = extract(solTicker);
    const bnb = extract(bnbTicker);
    const eth = extract(ethTicker);

    return [
      {
        symbol: 'SOL',
        name: 'Solana',
        address: 'So11111111111111111111111111111111111111112',
        price_usd: sol.price,
        price_change_24h: sol.change,
        volume_24h: sol.volume,
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
        price_usd: bnb.price,
        price_change_24h: bnb.change,
        volume_24h: bnb.volume,
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
        price_usd: eth.price,
        price_change_24h: eth.change,
        volume_24h: eth.volume,
        liquidity: 0,
        market_cap: 0,
        logo_url: 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png',
        network: 'ethereum',
        fdv: 0,
        market_cap_rank: 2,
      },
    ];
    }
  }
};

const fetchCoinGeckoPlatformList = async () => {
  const now = Date.now();
  if (PLATFORM_LIST_CACHE && now - PLATFORM_LIST_CACHE_TS < PLATFORM_LIST_TTL_MS) {
    return PLATFORM_LIST_CACHE;
  }
  const response = await retryFetch(`${COINGECKO_BASE_URL}/coins/list?include_platform=true`);
  const list = await response.json();
  PLATFORM_LIST_CACHE = Array.isArray(list) ? list : [];
  PLATFORM_LIST_CACHE_TS = now;
  return PLATFORM_LIST_CACHE;
};

const fetchFromCoinGecko = async () => {
  const response = await retryFetch(
    `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`
  );
  const data = await response.json();
  if (!Array.isArray(data)) return [];

  const platformList = await fetchCoinGeckoPlatformList();
  const byId = new Map<string, any>();
  for (const item of platformList) {
    if (item?.id) byId.set(item.id, item);
  }

  return data.map((coin: any) => {
    const platformRow = byId.get(coin.id);
    const best = pickBestPlatformAddress(platformRow?.platforms || {});
    return {
      id: coin.id || '',
      symbol: coin.symbol?.toUpperCase() || 'UNKNOWN',
      name: coin.name || 'Unknown Token',
      address: best.address || '',
      price_usd: Number(coin.current_price) || 0,
      price_change_24h: Number(coin.price_change_percentage_24h) || 0,
      volume_24h: Number(coin.total_volume) || 0,
      liquidity: Number(coin.market_cap) || 0,
      market_cap: Number(coin.market_cap) || 0,
      logo_url: coin.image || '',
      network: best.network,
      fdv: Number(coin.fully_diluted_valuation) || 0,
      market_cap_rank: Number(coin.market_cap_rank) || 999,
    };
  });
};

const fetchFromCoinMarketCap = async () => {
  const response = await retryFetch(
    `${COINMARKETCAP_API}?start=1&limit=5000&sortBy=market_cap&sortType=desc&convert=USD&cryptoType=all&tagType=all&audited=false&aux=ath,atl,high24h,low24h,num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply,volume_7d,volume_30d`
  );
  const result = await response.json();
  const list = result?.data?.cryptoCurrencyList;

  if (!Array.isArray(list)) return [];

  const memeTokens = list
    .filter((coin: any) => {
      const name = (coin.name || '').toLowerCase();
      const symbol = (coin.symbol || '').toLowerCase();
      const tags = Array.isArray(coin.tags) ? coin.tags.map((t: any) => String(t).toLowerCase()) : [];
      return (
        tags.includes('memes') ||
        tags.includes('meme') ||
        name.includes('doge') ||
        name.includes('shib') ||
        name.includes('pepe') ||
        name.includes('floki') ||
        name.includes('bonk') ||
        name.includes('meme') ||
        symbol.includes('doge') ||
        symbol.includes('shib') ||
        symbol.includes('pepe')
      );
    })
    .map((coin: any) => {
      const quote = coin.quotes?.[0] || {};
      const address = String(coin?.platform?.contract_address || '').trim();
      const network = inferNetworkFromCmcPlatform(coin?.platform, address);
      return {
        symbol: (coin.symbol || 'UNKNOWN').toUpperCase(),
        name: coin.name || 'Unknown Token',
        address,
        price_usd: Number(quote?.price) || 0,
        price_change_24h: Number(quote?.percentChange24h) || 0,
        volume_24h: Number(quote?.volume24h) || 0,
        liquidity: Number(quote?.marketCap) || 0,
        market_cap: Number(quote?.marketCap) || 0,
        logo_url: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
        network,
        fdv: Number(quote?.fullyDilutedMarketCap) || 0,
        market_cap_rank: Number(coin.cmcRank) || 999,
      };
    });

  const coreTokens = list
    .filter((coin: any) => {
      const symbol = String(coin?.symbol || '').toUpperCase();
      return symbol === 'SOL' || symbol === 'BNB' || symbol === 'ETH';
    })
    .map((coin: any) => {
      const quote = coin.quotes?.[0] || {};
      const symbol = String(coin?.symbol || '').toUpperCase();

      const fallbackAddress =
        symbol === 'SOL'
          ? 'So11111111111111111111111111111111111111112'
          : symbol === 'BNB'
            ? '0xbb4CdB9CBd36B01bD1cbaB777c5e04c0334f63C3'
            : '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

      const fallbackNetwork =
        symbol === 'SOL' ? 'solana' : symbol === 'BNB' ? 'bsc' : 'ethereum';

      return {
        symbol,
        name: coin?.name || symbol,
        address: String(coin?.platform?.contract_address || '').trim() || fallbackAddress,
        price_usd: Number(quote?.price) || 0,
        price_change_24h: Number(quote?.percentChange24h) || 0,
        volume_24h: Number(quote?.volume24h) || 0,
        liquidity: Number(quote?.marketCap) || 0,
        market_cap: Number(quote?.marketCap) || 0,
        logo_url:
          symbol === 'SOL'
            ? 'https://assets.coingecko.com/coins/images/4128/standard/solana.png'
            : symbol === 'BNB'
              ? 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png'
              : 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png',
        network: inferNetworkFromCmcPlatform(coin?.platform, fallbackAddress) || fallbackNetwork,
        fdv: Number(quote?.fullyDilutedMarketCap) || 0,
        market_cap_rank: Number(coin?.cmcRank) || 999,
      };
    });

  return [...coreTokens, ...memeTokens];
};

const enrichMissingAddresses = async (tokens: any[]) => {
  const platformList = await fetchCoinGeckoPlatformList();

  const bySymbol = new Map<string, any[]>();
  const byName = new Map<string, any[]>();
  for (const row of platformList) {
    const symbol = String(row?.symbol || '').toUpperCase();
    const name = normalizeText(row?.name || '');
    if (symbol) {
      const arr = bySymbol.get(symbol) || [];
      arr.push(row);
      bySymbol.set(symbol, arr);
    }
    if (name) {
      const arr = byName.get(name) || [];
      arr.push(row);
      byName.set(name, arr);
    }
  }

  return tokens.map((token) => {
    if (token.address) return token;

    const symbolKey = String(token.symbol || '').toUpperCase();
    const nameKey = normalizeText(token.name || '');
    const candidates = [...(byName.get(nameKey) || []), ...(bySymbol.get(symbolKey) || [])];

    for (const candidate of candidates) {
      const best = pickBestPlatformAddress(candidate?.platforms || {});
      if (best.address) {
        return {
          ...token,
          address: best.address,
          network: best.network || token.network || 'multi-chain',
        };
      }
    }

    return token;
  });
};

const dedupeTokens = (tokens: any[]) => {
  const map = new Map<string, any>();
  for (const token of tokens) {
    const key = `${String(token.symbol || '').toUpperCase()}::${normalizeText(token.name || '')}`;
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, token);
    } else {
      map.set(key, mergeTokenFields(map.get(key), token));
    }
  }
  return Array.from(map.values());
};

const saveTokenCache = async (tokens: any[]) => {
  try {
    await Deno.mkdir('./data', { recursive: true });
    await Deno.writeTextFile(
      TOKEN_CACHE_FILE,
      JSON.stringify({ updatedAt: new Date().toISOString(), tokens }, null, 2)
    );
  } catch {
    // ignore cache write errors
  }
};

const loadTokenCache = async () => {
  try {
    const raw = await Deno.readTextFile(TOKEN_CACHE_FILE);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.tokens) ? parsed.tokens : [];
  } catch {
    return [];
  }
};

export async function fetchMemeTokensProxy(_req: Request) {
  try {
    const [geckoResult, cmcResult, coreResult] = await Promise.allSettled([
      fetchFromCoinGecko(),
      fetchFromCoinMarketCap(),
      fetchCoreBaseTokens(),
    ]);

    const geckoTokens = geckoResult.status === 'fulfilled' ? geckoResult.value : [];
    const cmcTokens = cmcResult.status === 'fulfilled' ? cmcResult.value : [];
    const coreTokens = coreResult.status === 'fulfilled' ? coreResult.value : [];

    let tokens = dedupeTokens([
      ...coreTokens,
      ...geckoTokens,
      ...cmcTokens,
      ...ADDITIONAL_MEME_TOKENS,
    ]);
    tokens = await enrichMissingAddresses(tokens);
    tokens = sortTokens(tokens);

    if (tokens.length > 0) {
      LAST_SUCCESS_TOKENS = tokens;
      await saveTokenCache(tokens);
    }

    return Response.json({ success: true, tokens });
  } catch (error: any) {
    const diskCached = await loadTokenCache();
    return Response.json({
      success: true,
      tokens:
        LAST_SUCCESS_TOKENS.length > 0
          ? LAST_SUCCESS_TOKENS
          : diskCached.length > 0
            ? diskCached
            : ADDITIONAL_MEME_TOKENS,
      error: error?.message || 'unknown_error',
    });
  }
}
