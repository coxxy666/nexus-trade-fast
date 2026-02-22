// Real-time Meme Cryptocurrency Market Data Service
// Fetches live data from CoinGecko API

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Top meme coins to track
const MEME_COINS = [
  'dogecoin',
  'shiba-inu',
  'pepe',
  'floki',
  'bonk',
  'dogwifhat',
  'meme',
  'memecoin',
  'baby-doge-coin',
  'samoyedcoin'
];

export async function fetchRealTimeMemeData() {
  try {
    const ids = MEME_COINS.join(',');
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch meme coin data');
    }

    const data = await response.json();
    
    return data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price,
      price_change_24h: coin.price_change_percentage_24h || 0,
      total_volume: coin.total_volume,
      market_cap: coin.market_cap,
      price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      high_24h: coin.high_24h,
      low_24h: coin.low_24h,
      circulating_supply: coin.circulating_supply,
      last_updated: new Date(coin.last_updated)
    }));
  } catch (error) {
    console.error('Error fetching real-time meme data:', error);
    // Fallback to empty array if API fails
    return [];
  }
}

export async function fetchGlobalMemeStats() {
  try {
    const coins = await fetchRealTimeMemeData();
    
    if (coins.length === 0) {
      return {
        total_market_cap: 0,
        total_volume_24h: 0,
        average_change_24h: 0,
        coins_tracked: 0
      };
    }

    const totalMarketCap = coins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
    const totalVolume = coins.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
    const avgChange = coins.reduce((sum, coin) => sum + coin.price_change_24h, 0) / coins.length;

    return {
      total_market_cap: totalMarketCap,
      total_volume_24h: totalVolume,
      average_change_24h: avgChange,
      coins_tracked: coins.length
    };
  } catch (error) {
    console.error('Error fetching global meme stats:', error);
    return {
      total_market_cap: 0,
      total_volume_24h: 0,
      average_change_24h: 0,
      coins_tracked: 0
    };
  }
}
