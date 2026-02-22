// Service for fetching trending, gainers, and losers meme coins
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

export const fetchTrendingMemeCoins = async () => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/search/trending`
    );
    const data = await response.json();
    
    if (data?.coins) {
      return data.coins
        .filter(coin => {
          const tags = coin.data?.tags || [];
          return tags.includes('memes') || tags.includes('meme');
        })
        .slice(0, 5)
        .map(coin => ({
          symbol: coin.item.symbol?.toUpperCase() || 'UNKNOWN',
          name: coin.item.name || 'Unknown Token',
          address: coin.item.id || '',
          price_usd: coin.item.data?.price || 0,
          price_change_24h: coin.item.data?.price_change_24h?.usd || 0,
          volume_24h: coin.item.data?.total_volume || 0,
          market_cap: coin.item.market_cap_rank ? coin.item.market_cap_rank * 1000000 : 0,
          logo_url: coin.item.large || `https://ui-avatars.com/api/?name=${coin.item.symbol}&background=random`,
          market_cap_rank: coin.item.market_cap_rank || 999,
        }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching trending meme coins:', error);
    return [];
  }
};

export const fetchGainersMemeCoins = async () => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&category=meme-token&order=price_change_24h_desc&per_page=5&sparkline=false`
    );
    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data.map(coin => ({
        symbol: coin.symbol?.toUpperCase() || 'UNKNOWN',
        name: coin.name || 'Unknown Token',
        address: coin.id || '',
        price_usd: coin.current_price || 0,
        price_change_24h: coin.price_change_percentage_24h || 0,
        volume_24h: coin.total_volume || 0,
        market_cap: coin.market_cap || 0,
        logo_url: coin.image || `https://ui-avatars.com/api/?name=${coin.symbol}&background=random`,
        market_cap_rank: coin.market_cap_rank || 999,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching gainers:', error);
    return [];
  }
};

export const fetchLosersMemeCoins = async () => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&category=meme-token&order=price_change_24h_asc&per_page=5&sparkline=false`
    );
    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data.map(coin => ({
        symbol: coin.symbol?.toUpperCase() || 'UNKNOWN',
        name: coin.name || 'Unknown Token',
        address: coin.id || '',
        price_usd: coin.current_price || 0,
        price_change_24h: coin.price_change_percentage_24h || 0,
        volume_24h: coin.total_volume || 0,
        market_cap: coin.market_cap || 0,
        logo_url: coin.image || `https://ui-avatars.com/api/?name=${coin.symbol}&background=random`,
        market_cap_rank: coin.market_cap_rank || 999,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching losers:', error);
    return [];
  }
};

export const fetchHighVolumeMemeCoins = async () => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&category=meme-token&order=volume_desc&per_page=5&sparkline=false`
    );
    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data.map(coin => ({
        symbol: coin.symbol?.toUpperCase() || 'UNKNOWN',
        name: coin.name || 'Unknown Token',
        address: coin.id || '',
        price_usd: coin.current_price || 0,
        price_change_24h: coin.price_change_percentage_24h || 0,
        volume_24h: coin.total_volume || 0,
        market_cap: coin.market_cap || 0,
        logo_url: coin.image || `https://ui-avatars.com/api/?name=${coin.symbol}&background=random`,
        market_cap_rank: coin.market_cap_rank || 999,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching high volume coins:', error);
    return [];
  }
};
